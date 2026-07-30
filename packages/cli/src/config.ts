/**
 * Profiles and credentials.
 *
 * They are split into two files on purpose: the configuration (`config.json`) can be
 * shown, pasted into an issue, even committed; the credentials (`credentials.json`)
 * cannot. Keeping them mixed guarantees that sooner or later someone pastes a token into
 * a ticket.
 *
 * This matters more than usual because the MCP server will run with these same
 * credentials: a token an agent can read from a world-readable file is the easiest way to
 * lose an entire account.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

export interface Profile {
  /** API base URL. Changed to point at your own environment. */
  base_url?: string;
  /** Identity server for `truo auth login` (device flow). */
  idp_url?: string;
  /** Default output format for this profile. */
  output?: string;
  /** Account the token belongs to, informational only (filled in at login). */
  account?: string;
}

export interface Config {
  current_profile: string;
  profiles: Record<string, Profile>;
}

const DEFAULT_CONFIG: Config = { current_profile: "default", profiles: { default: {} } };

export function configDir(): string {
  const override = process.env["TRUO_CONFIG_DIR"];
  if (override) return override;
  return join(homedir(), ".truo");
}

const configPath = () => join(configDir(), "config.json");
const credentialsPath = () => join(configDir(), "credentials.json");

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    // A corrupt file must not leave the CLI unusable: warn and continue with the
    // defaults — worse than reading it properly, much better than not starting at all.
    process.stderr.write(`[truo] ${path} is corrupt; ignoring it.\n`);
    return fallback;
  }
}

function writeJson(path: string, data: unknown, secret: boolean): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", { encoding: "utf8", mode: secret ? 0o600 : 0o644 });
  if (secret) {
    // `mode` in `writeFileSync` is not applied if the file already existed; the explicit
    // chmod fixes a file that was created earlier with lax permissions.
    try {
      chmodSync(path, 0o600);
    } catch {
      /* On Windows POSIX permissions do not apply; a separate warning covers it. */
    }
  }
}

export function loadConfig(): Config {
  const cfg = readJson<Config>(configPath(), DEFAULT_CONFIG);
  if (!cfg.profiles) cfg.profiles = {};
  if (!cfg.profiles[cfg.current_profile ?? "default"]) {
    cfg.current_profile = cfg.current_profile ?? "default";
    cfg.profiles[cfg.current_profile] = {};
  }
  return cfg;
}

export function saveConfig(cfg: Config): void {
  writeJson(configPath(), cfg, false);
}

type CredentialStore = Record<string, { token: string; created_at?: string }>;

export function loadCredentials(): CredentialStore {
  return readJson<CredentialStore>(credentialsPath(), {});
}

export function saveToken(profile: string, token: string): { path: string; warning: string | null } {
  const store = loadCredentials();
  store[profile] = { token, created_at: new Date().toISOString() };
  const path = credentialsPath();
  writeJson(path, store, true);

  // On Windows there is no real 0600 mode. Saying so beats pretending the file is
  // protected: the user can decide to use TRUO_TOKEN from their secrets manager instead.
  let warning: string | null = null;
  if (platform() === "win32") {
    warning =
      `The token was written to ${path}. On Windows this file has no POSIX permissions: ` +
      `protect it with your profile's ACLs or use the TRUO_TOKEN environment variable.`;
  } else {
    try {
      const mode = statSync(path).mode & 0o777;
      if (mode !== 0o600) warning = `Could not set ${path} to 0600 (it ended up as ${mode.toString(8)}).`;
    } catch {
      /* If the mode cannot be read, there is nothing useful to report. */
    }
  }
  return { path, warning };
}

export function deleteToken(profile: string): boolean {
  const store = loadCredentials();
  if (!(profile in store)) return false;
  delete store[profile];
  writeJson(credentialsPath(), store, true);
  return true;
}

export interface Resolved {
  profile: string;
  token: string | null;
  baseUrl: string | undefined;
  idpUrl: string | undefined;
  output: string | undefined;
  /** Where the token came from; shown in `truo auth status`. */
  tokenSource: "flag" | "env" | "profile" | null;
}

/**
 * Resolves the effective configuration.
 *
 * The precedence (`--token` → `TRUO_TOKEN` → profile) is the conventional one for a
 * practical reason: in CI the variable is exported, and nobody wants a `~/.truo`
 * inherited from the base image to win silently.
 */
export function resolve(opts: { token?: string | undefined; profile?: string | undefined; baseUrl?: string | undefined }): Resolved {
  const cfg = loadConfig();
  const profile = opts.profile ?? process.env["TRUO_PROFILE"] ?? cfg.current_profile ?? "default";
  const entry = cfg.profiles[profile] ?? {};

  let token: string | null = null;
  let tokenSource: Resolved["tokenSource"] = null;
  if (opts.token) {
    token = opts.token;
    tokenSource = "flag";
  } else if (process.env["TRUO_TOKEN"]) {
    token = process.env["TRUO_TOKEN"]!;
    tokenSource = "env";
  } else {
    const stored = loadCredentials()[profile];
    if (stored?.token) {
      token = stored.token;
      tokenSource = "profile";
    }
  }

  return {
    profile,
    token,
    baseUrl: opts.baseUrl ?? process.env["TRUO_BASE_URL"] ?? entry.base_url,
    idpUrl: process.env["TRUO_IDP_URL"] ?? entry.idp_url,
    output: entry.output,
    tokenSource,
  };
}

/**
 * `tc_live_aaaa…zzzz`. **Never print a full token**: the terminal keeps history, and
 * that history ends up in screenshots and support tickets.
 */
export function maskToken(token: string): string {
  if (token.length <= 16) return `${token.slice(0, 4)}…`;
  return `${token.slice(0, 12)}…${token.slice(-4)}`;
}
