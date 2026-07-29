/**
 * Perfiles y credenciales.
 *
 * Se separan en dos archivos a proposito: la configuracion (`config.json`) se puede
 * mostrar, pegar en un issue y hasta commitear; las credenciales (`credentials.json`) no.
 * Tenerlas mezcladas garantiza que tarde o temprano alguien pegue un token en un ticket.
 *
 * Importa mas de lo habitual porque el servidor MCP va a correr con estas mismas
 * credenciales: un token que un agente puede leer de un archivo legible por todo el mundo
 * es la forma mas facil de perder una cuenta entera.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

export interface Profile {
  /** Base URL de la API. Se cambia para apuntar a un entorno propio. */
  base_url?: string;
  /** Servidor de identidad para `truo auth login` (device flow). */
  idp_url?: string;
  /** Formato de salida por defecto de este perfil. */
  output?: string;
  /** Cuenta a la que pertenece el token, solo informativo (se llena en el login). */
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
    // Un archivo corrupto no debe dejar el CLI inutilizable: se avisa y se sigue con los
    // valores por defecto, que es peor que leerlo bien y muchisimo mejor que no arrancar.
    process.stderr.write(`[truo] ${path} esta corrupto; se ignora.\n`);
    return fallback;
  }
}

function writeJson(path: string, data: unknown, secret: boolean): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", { encoding: "utf8", mode: secret ? 0o600 : 0o644 });
  if (secret) {
    // `mode` en `writeFileSync` no se aplica si el archivo ya existia; el chmod explicito
    // arregla un archivo que se creo con permisos laxos antes.
    try {
      chmodSync(path, 0o600);
    } catch {
      /* En Windows los permisos POSIX no aplican; se avisa aparte. */
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

  // En Windows no hay modo 0600 real. Decirlo es mejor que fingir que el archivo esta
  // protegido: el usuario puede decidir usar TRUO_TOKEN desde su gestor de secretos.
  let warning: string | null = null;
  if (platform() === "win32") {
    warning =
      `El token quedo en ${path}. En Windows este archivo no tiene permisos POSIX: ` +
      `protegelo con las ACL de tu perfil o usa la variable de entorno TRUO_TOKEN.`;
  } else {
    try {
      const mode = statSync(path).mode & 0o777;
      if (mode !== 0o600) warning = `No se pudo dejar ${path} en 0600 (quedo en ${mode.toString(8)}).`;
    } catch {
      /* Si no se puede leer el modo, no hay nada util que informar. */
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
  /** De donde salio el token; se muestra en `truo auth status`. */
  tokenSource: "flag" | "env" | "profile" | null;
}

/**
 * Resuelve la configuracion efectiva.
 *
 * La precedencia (`--token` → `TRUO_TOKEN` → perfil) es la de siempre por una razon
 * practica: en CI se exporta la variable y nadie quiere que un `~/.truo` heredado de la
 * imagen base gane silenciosamente.
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
 * `tc_live_aaaa…zzzz`. **Nunca imprimir un token entero**: la terminal guarda historial, y
 * ese historial termina en capturas de pantalla y en tickets de soporte.
 */
export function maskToken(token: string): string {
  if (token.length <= 16) return `${token.slice(0, 4)}…`;
  return `${token.slice(0, 12)}…${token.slice(-4)}`;
}
