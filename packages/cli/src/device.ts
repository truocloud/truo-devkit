/**
 * Device Authorization Grant (RFC 8628) against `login.truo.cloud`.
 *
 * **Why this flow and not a localhost callback.** Half the logins for an
 * infrastructure CLI happen inside a bastion over SSH: there is no browser to
 * open and no local port to come back to. The device flow only needs the person
 * to read a code on one screen and type it into another.
 *
 * **What it produces.** A short-lived IdP token good for exactly one thing:
 * creating the API key the CLI will store. The durable credential is the key —
 * revocable from the panel, with narrowed scopes and its own row in the audit
 * log — not the session. See `auth login` in `builtins.ts`.
 */
import { spawn } from "node:child_process";
import { platform } from "node:os";
import { OPERATIONS } from "../../sdk/src/generated/operations.ts";
import { CliError, EXIT } from "./exit.ts";

export const DEFAULT_IDP_URL = "https://login.truo.cloud";
export const DEVICE_CLIENT_ID = "truo-cli";

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  /** URL to go to. Absolute: it can be typed into another machine's browser. */
  verificationUri: string;
  /** Same, with the code already filled in. This is the one we try to open. */
  verificationUriComplete: string | null;
  expiresIn: number;
  /** Minimum seconds between polls, per the server. */
  interval: number;
}

/**
 * The scopes an API key can have, taken from the contract itself.
 *
 * Derived from `OPERATIONS` instead of a hand-written list because a
 * hand-written list goes stale at the first new endpoint, and the symptom would
 * be the worst possible one: a CLI command that exists but returns 403 with the
 * key the CLI itself just created.
 *
 * `apikeys:*` and `users:*` are excluded because the API does not grant them to
 * a key — requesting them would fail the whole creation.
 */
export function grantableScopes(): string[] {
  const scopes = new Set<string>();
  for (const meta of Object.values(OPERATIONS)) {
    const scope = (meta as { scope: string | null }).scope;
    if (!scope) continue;
    const resource = scope.split(":")[0];
    if (resource === "apikeys" || resource === "users") continue;
    scopes.add(scope);
  }
  return [...scopes].sort();
}

interface DeviceCodeResponse {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  verificationUri?: string;
  verificationUriComplete?: string;
  expires_in?: number;
  interval?: number;
}

/** Normalizes a URL the server may have returned as relative. */
function absolutize(idpUrl: string, uri: string | undefined): string | null {
  if (!uri) return null;
  if (/^https?:\/\//i.test(uri)) return uri;
  return `${idpUrl.replace(/\/+$/, "")}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

async function readError(res: Response): Promise<{ code: string; description: string }> {
  const raw = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* A proxy's HTML error page is not JSON; use the raw text. */
  }
  // Better Auth nests the plugin's error under `error` sometimes and leaves it
  // flat other times depending on the version; accepting both forms beats
  // pinning to one and breaking on an IdP `bun update`.
  const nested = (body.error ?? {}) as Record<string, unknown>;
  const code = String(
    (typeof body.error === "string" ? body.error : nested.code ?? nested.message) ??
      body.code ??
      `http_${res.status}`,
  );
  const description = String(
    body.error_description ?? nested.error_description ?? body.message ?? raw.slice(0, 200),
  );
  return { code, description };
}

/** Step 1: request the (device_code, user_code) pair. */
export async function requestDeviceCode(
  idpUrl: string,
  scopes: string[],
): Promise<DeviceAuthorization> {
  let res: Response;
  try {
    res = await fetch(`${idpUrl.replace(/\/+$/, "")}/api/auth/device/code`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ client_id: DEVICE_CLIENT_ID, scope: scopes.join(" ") }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new CliError(
      `Could not reach ${idpUrl}: ${(err as Error).message}`,
      EXIT.UNAUTHENTICATED,
      "If you are behind a proxy or without internet access, use 'truo auth login --token <key>' with a key from the panel.",
    );
  }

  if (!res.ok) {
    const { code, description } = await readError(res);
    // A 404 is not "you were rejected": it is "there is no device flow there". It
    // happens against an old IdP instance or a wrong URL, and the generic message
    // sends people hunting through their credentials, which are fine.
    const hint =
      code === "http_404"
        ? `${idpUrl} does not expose the device flow. Check the URL (truo config set idp_url <url>) ` +
          `or use 'truo auth login --token <key>' with a key from the panel.`
        : description || "Try again, or use 'truo auth login --token <key>'.";
    throw new CliError(
      `The identity server rejected the request (${code}).`,
      EXIT.UNAUTHENTICATED,
      hint,
    );
  }

  const body = (await res.json()) as DeviceCodeResponse;
  if (!body.device_code || !body.user_code) {
    throw new CliError(
      "The identity server returned a response that makes no sense.",
      EXIT.INTERNAL,
      "Try 'truo auth login --token <key>' in the meantime.",
    );
  }

  const verificationUri =
    absolutize(idpUrl, body.verification_uri ?? body.verificationUri) ??
    `${idpUrl.replace(/\/+$/, "")}/device`;

  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri,
    verificationUriComplete:
      absolutize(idpUrl, body.verification_uri_complete ?? body.verificationUriComplete) ??
      `${verificationUri}?user_code=${encodeURIComponent(body.user_code)}`,
    expiresIn: body.expires_in ?? 600,
    // The 5 s floor comes from the RFC. A server that returned 0 would have us hammering it.
    interval: Math.max(1, body.interval ?? 5),
  };
}

export interface PollOptions {
  onTick?: (secondsLeft: number) => void;
  signal?: AbortSignal;
  /**
   * Wait between polls. Only tests replace it: the 5 s increment the RFC
   * requires on `slow_down` is exactly what needs verifying, and it cannot be
   * verified by actually waiting 5 s on every run.
   */
  wait?: (ms: number) => Promise<void>;
}

/**
 * Step 2: wait for the person to approve.
 *
 * The server dictates the interval and `slow_down` raises it: a client that
 * ignores that earns itself a rate limit and turns "approve in the browser"
 * into "the login failed".
 */
export async function pollForToken(
  idpUrl: string,
  auth: DeviceAuthorization,
  opts: PollOptions = {},
): Promise<string> {
  const deadline = Date.now() + auth.expiresIn * 1000;
  // The RFC floor, applied here too and not only when reading the response: an
  // interval of 0 would turn this into a tight loop against the IdP.
  let interval = Math.max(1, auth.interval);
  const wait = opts.wait ?? ((ms: number) => sleep(ms, opts.signal));

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) throw new CliError("Cancelled.", EXIT.ABORTED);
    await wait(interval * 1000);
    opts.onTick?.(Math.max(0, Math.round((deadline - Date.now()) / 1000)));

    let res: Response;
    try {
      res = await fetch(`${idpUrl.replace(/\/+$/, "")}/api/auth/device/token`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          grant_type: GRANT_TYPE,
          device_code: auth.deviceCode,
          client_id: DEVICE_CLIENT_ID,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      // A network blip does not invalidate the code: it stays alive on the
      // server side until it expires. Retrying is correct; aborting would lose
      // an approval the person may already have given.
      continue;
    }

    if (res.ok) {
      const body = (await res.json()) as { access_token?: string };
      if (body.access_token) return body.access_token;
      // A 200 without a token: should not happen, but treating it as pending is
      // safer than returning undefined and breaking downstream.
      continue;
    }

    const { code, description } = await readError(res);
    switch (code) {
      case "authorization_pending":
        continue;
      case "slow_down":
        interval += 5;
        continue;
      case "access_denied":
        throw new CliError("You declined the authorization in the browser.", EXIT.ABORTED);
      case "expired_token":
        throw new CliError(
          "The code expired before you approved it.",
          EXIT.UNAUTHENTICATED,
          "Run 'truo auth login' again.",
        );
      default:
        throw new CliError(`Login failed (${code}).`, EXIT.UNAUTHENTICATED, description);
    }
  }

  throw new CliError(
    "The code expired before you approved it.",
    EXIT.UNAUTHENTICATED,
    "Run 'truo auth login' again.",
  );
}

/**
 * Signs the IdP session out.
 *
 * Called as soon as the API key is stored. The device-flow token is no longer
 * needed, and leaving it alive would be leaving behind a credential nobody will
 * remember to revoke. Best-effort on purpose: failing here must not ruin a
 * login that already succeeded.
 */
export async function signOut(idpUrl: string, token: string): Promise<void> {
  try {
    await fetch(`${idpUrl.replace(/\/+$/, "")}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* Best-effort: the session expires on its own. */
  }
}

/**
 * Tries to open the browser. Returns `false` if there is none.
 *
 * `false` is a normal outcome, not an error: over SSH there is never a browser,
 * and that is exactly the case the device flow exists for. The URL is always
 * printed, whether it opens or not.
 */
export function openBrowser(url: string): boolean {
  // An environment without a display (SSH, container, CI) has no browser to open,
  // and on Linux `xdg-open` can hang instead of failing.
  if (platform() === "linux" && !process.env["DISPLAY"] && !process.env["WAYLAND_DISPLAY"]) {
    return false;
  }
  const [cmd, args] =
    platform() === "win32"
      ? // `start` is a cmd built-in, and the "" is the window title: without it, cmd
        // takes the URL as the title and opens nothing.
        (["cmd", ["/c", "start", "", url]] as const)
      : platform() === "darwin"
        ? (["open", [url]] as const)
        : (["xdg-open", [url]] as const);
  try {
    const child = spawn(cmd, [...args], { stdio: "ignore", detached: true });
    child.on("error", () => {
      /* Without the handler, an ENOENT from xdg-open takes down the whole process. */
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(timer);
      reject(new CliError("Cancelled.", EXIT.ABORTED));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
