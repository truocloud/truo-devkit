/**
 * Device Authorization Grant (RFC 8628) contra `login.truo.cloud`.
 *
 * **Por qué este flujo y no un callback a localhost.** La mitad de los logins de
 * un CLI de infraestructura pasan dentro de un bastion por SSH: no hay navegador
 * que abrir ni puerto local al que volver. El device flow solo necesita que la
 * persona pueda leer un código en una pantalla y tipearlo en otra.
 *
 * **Qué produce.** Un token del IdP, de vida corta, que sirve para exactamente
 * una cosa: crear la API key que el CLI va a guardar. La credencial duradera es
 * la key —revocable desde el panel, con scopes acotados y con su propia fila en
 * la auditoría—, no la sesión. Ver `auth login` en `builtins.ts`.
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
  /** URL a la que ir. Absoluta: puede tipearse en el navegador de otra máquina. */
  verificationUri: string;
  /** Igual pero con el código ya puesto. Es la que se intenta abrir. */
  verificationUriComplete: string | null;
  expiresIn: number;
  /** Segundos mínimos entre polls, según el servidor. */
  interval: number;
}

/**
 * Los scopes que una API key puede tener, sacados del propio contrato.
 *
 * Se derivan de `OPERATIONS` en vez de una lista escrita a mano porque una lista
 * escrita a mano se queda vieja en el primer endpoint nuevo, y el síntoma sería
 * el peor posible: un comando del CLI que existe pero devuelve 403 con la key
 * que el propio CLI acaba de crear.
 *
 * `apikeys:*` y `users:*` quedan afuera porque la API no los otorga a una key —
 * pedirlos haría fallar el alta entera.
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

/** Normaliza una URL que el servidor puede haber devuelto relativa. */
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
    /* Un HTML de error de proxy no es JSON; se usa el texto crudo. */
  }
  // Better Auth anida el error del plugin bajo `error` unas veces y lo deja
  // plano otras según la versión; se aceptan las dos formas antes que atarse a
  // una y romper en un `bun update` del IdP.
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

/** Paso 1: pedir el par (device_code, user_code). */
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
      `No se pudo contactar a ${idpUrl}: ${(err as Error).message}`,
      EXIT.UNAUTHENTICATED,
      "Si estás detrás de un proxy o sin salida a internet, usa 'truo auth login --token <key>' con una key del panel.",
    );
  }

  if (!res.ok) {
    const { code, description } = await readError(res);
    // Un 404 no es "te rechazó": es "ahí no hay device flow". Pasa contra una
    // instancia vieja del IdP o contra una URL equivocada, y el mensaje generico
    // manda a buscar el problema en las credenciales, que estan bien.
    const hint =
      code === "http_404"
        ? `${idpUrl} no expone el device flow. Verifica la URL (truo config set idp_url <url>) ` +
          `o usa 'truo auth login --token <key>' con una key del panel.`
        : description || "Probá de nuevo, o usa 'truo auth login --token <key>'.";
    throw new CliError(
      `El servidor de identidad rechazó el pedido (${code}).`,
      EXIT.UNAUTHENTICATED,
      hint,
    );
  }

  const body = (await res.json()) as DeviceCodeResponse;
  if (!body.device_code || !body.user_code) {
    throw new CliError(
      "El servidor de identidad devolvió una respuesta que no se entiende.",
      EXIT.INTERNAL,
      "Probá 'truo auth login --token <key>' mientras tanto.",
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
    // El piso de 5 s es del RFC. Un servidor que devuelva 0 nos haría martillarlo.
    interval: Math.max(1, body.interval ?? 5),
  };
}

export interface PollOptions {
  onTick?: (secondsLeft: number) => void;
  signal?: AbortSignal;
  /**
   * Espera entre polls. Solo los tests la reemplazan: el incremento de 5 s que
   * exige el RFC ante `slow_down` es justo lo que hay que verificar, y no se
   * puede verificar esperando 5 s de verdad en cada corrida.
   */
  wait?: (ms: number) => Promise<void>;
}

/**
 * Paso 2: esperar a que la persona apruebe.
 *
 * El intervalo lo manda el servidor y `slow_down` lo sube: un cliente que
 * ignora eso se gana un rate limit y convierte "aprobá en el navegador" en "el
 * login falló".
 */
export async function pollForToken(
  idpUrl: string,
  auth: DeviceAuthorization,
  opts: PollOptions = {},
): Promise<string> {
  const deadline = Date.now() + auth.expiresIn * 1000;
  // Piso del RFC, aplicado tambien aca y no solo al leer la respuesta: un
  // intervalo de 0 convertiria esto en un bucle cerrado contra el IdP.
  let interval = Math.max(1, auth.interval);
  const wait = opts.wait ?? ((ms: number) => sleep(ms, opts.signal));

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) throw new CliError("Cancelado.", EXIT.ABORTED);
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
      // Un corte de red no invalida el código: sigue vivo del lado del servidor
      // hasta que vence. Reintentar es correcto; abortar perdería una
      // aprobación que la persona quizá ya hizo.
      continue;
    }

    if (res.ok) {
      const body = (await res.json()) as { access_token?: string };
      if (body.access_token) return body.access_token;
      // 200 sin token: no debería pasar, pero tratarlo como pendiente es más
      // seguro que devolver undefined y romper aguas abajo.
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
        throw new CliError("Rechazaste la autorización en el navegador.", EXIT.ABORTED);
      case "expired_token":
        throw new CliError(
          "El código venció antes de que lo aprobaras.",
          EXIT.UNAUTHENTICATED,
          "Corré 'truo auth login' de nuevo.",
        );
      default:
        throw new CliError(`El login falló (${code}).`, EXIT.UNAUTHENTICATED, description);
    }
  }

  throw new CliError(
    "El código venció antes de que lo aprobaras.",
    EXIT.UNAUTHENTICATED,
    "Corré 'truo auth login' de nuevo.",
  );
}

/**
 * Cierra la sesión del IdP.
 *
 * Se llama apenas la API key está guardada. El token del device flow ya no hace
 * falta, y dejarlo vivo sería dejar tirada una credencial que nadie va a
 * acordarse de revocar. Best-effort a propósito: fallar acá no debe arruinar un
 * login que ya salió bien.
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
    /* Best-effort: la sesión vence sola. */
  }
}

/**
 * Intenta abrir el navegador. Devuelve `false` si no hay ninguno.
 *
 * `false` es un resultado normal, no un error: por SSH nunca hay navegador, y
 * ese es justamente el caso para el que existe el device flow. La URL se
 * imprime siempre, se abra o no.
 */
export function openBrowser(url: string): boolean {
  // Un entorno sin display (SSH, contenedor, CI) no tiene navegador que abrir, y
  // en Linux `xdg-open` puede colgarse en vez de fallar.
  if (platform() === "linux" && !process.env["DISPLAY"] && !process.env["WAYLAND_DISPLAY"]) {
    return false;
  }
  const [cmd, args] =
    platform() === "win32"
      ? // `start` es interno de cmd, y el "" es el título de ventana: sin él, cmd
        // toma la URL como título y no abre nada.
        (["cmd", ["/c", "start", "", url]] as const)
      : platform() === "darwin"
        ? (["open", [url]] as const)
        : (["xdg-open", [url]] as const);
  try {
    const child = spawn(cmd, [...args], { stdio: "ignore", detached: true });
    child.on("error", () => {
      /* Sin el handler, un ENOENT de xdg-open tumba el proceso entero. */
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
      reject(new CliError("Cancelado.", EXIT.ABORTED));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
