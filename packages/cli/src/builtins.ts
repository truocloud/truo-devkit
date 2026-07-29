/**
 * Los comandos que NO salen del OpenAPI.
 *
 * Son los que no corresponden a un endpoint: manejo de credenciales locales, perfiles, la
 * llamada cruda y el autocompletado. Todo lo demas se genera, y esta lista se mantiene
 * corta a proposito — cada comando escrito a mano es uno que puede quedar desalineado con
 * la API.
 */
import { hostname } from "node:os";
import { TruoClient } from "../../sdk/src/index.ts";
import type * as T from "../../sdk/src/generated/types.ts";
import { API_BASE_URL } from "../../sdk/src/generated/operations.ts";
import {
  DEFAULT_IDP_URL,
  grantableScopes,
  openBrowser,
  pollForToken,
  requestDeviceCode,
  signOut,
} from "./device.ts";
import { COMMANDS } from "./generated/commands.ts";
import { flagBool, flagString, type ParsedArgs } from "./args.ts";
import { CliError, EXIT } from "./exit.ts";
import { color, info, out, parseFormat, render } from "./output.ts";
import { askSecret, confirm, isInteractive } from "./prompt.ts";
import { deleteToken, loadConfig, maskToken, resolve, saveConfig, saveToken, configDir } from "./config.ts";
import type { Builtin } from "./help.ts";
import { toCliError } from "./execute.ts";

export interface BuiltinContext {
  args: ParsedArgs;
  positionals: string[];
  /** Cliente ya autenticado. Lanza si no hay credencial: los builtins que no la necesitan no lo piden. */
  client: () => TruoClient;
  resolved: ReturnType<typeof resolve>;
}

export interface BuiltinCommand extends Builtin {
  /** `true` si el comando funciona sin credencial (login, config, completion). */
  anonymous?: boolean;
  run: (ctx: BuiltinContext) => Promise<number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guarda una key ya validada y deja el perfil listo. Compartido por los dos
 * caminos del login (device flow y `--token`) para que no haya forma de que uno
 * escriba algo distinto del otro.
 */
async function persistToken(
  profile: string,
  token: string,
  baseUrl: string | undefined,
  account: T.Account,
): Promise<void> {
  const { path, warning } = saveToken(profile, token);
  const cfg = loadConfig();
  cfg.profiles[profile] = {
    ...(cfg.profiles[profile] ?? {}),
    account: account.email ?? account.id ?? undefined,
    ...(baseUrl ? { base_url: baseUrl } : {}),
  };
  saveConfig(cfg);

  info(
    `${color.green("Listo.")} Perfil ${color.bold(profile)} autenticado como ` +
      `${color.bold(account.email ?? account.id ?? "?")} — token ${maskToken(token)}.`,
  );
  info(color.dim(`Guardado en ${path}`));
  if (warning) info(color.yellow(warning));
}

const authLogin: BuiltinCommand = {
  path: ["auth", "login"],
  summary: "Entrar con el navegador y crear la API key de este equipo",
  usage: "truo auth login [--scopes a,b] [--no-browser] | truo auth login --token <key>",
  anonymous: true,
  details:
    "Por defecto abre un login en el navegador (device flow, RFC 8628) y crea una API key " +
    "propia de este equipo. La key es la credencial que queda guardada: se puede revocar " +
    "desde el panel sin tocar el resto, y la sesion del navegador se cierra apenas termina.\n\n" +
    "--token <key>   Usa una key ya creada en el panel, sin navegador (para CI y bastiones).\n" +
    "--scopes a,b    Acota la key. Por defecto pide todo lo que el CLI puede usar.\n" +
    "--no-browser    No intenta abrir el navegador; solo imprime la URL.\n" +
    "--name <n>      Nombre de la key en el panel (por defecto truo-cli@<equipo>).",
  async run(ctx) {
    const profile = ctx.resolved.profile;
    const baseUrl = ctx.resolved.baseUrl;
    const explicitToken = flagString(ctx.args.flags, "token");

    // ── Camino corto: una key que ya existe ─────────────────────────────────
    // `--token` a secas (sin valor) tambien entra aca: quien lo escribio quiere
    // pegar una key, no abrir un navegador.
    if (ctx.args.flags.has("token") || flagBool(ctx.args.flags, "paste") === true) {
      let token = explicitToken;
      if (!token) {
        if (!isInteractive()) {
          throw new CliError(
            "Sin terminal interactiva no se puede pedir el token.",
            EXIT.UNAUTHENTICATED,
            "Pasalo con --token, o exporta TRUO_TOKEN en tu CI.",
          );
        }
        info(`Crea una API key en ${color.cyan("https://consola.truocloud.com/settings/api-keys")} y pegala aca.`);
        info(color.dim("No se muestra mientras la escribis."));
        token = await askSecret("Token: ");
      }
      if (!token) throw new CliError("No se ingreso ningun token.", EXIT.UNAUTHENTICATED);
      if (!/^tc_(live|test)_/.test(token)) {
        throw new CliError(
          "Eso no parece una API key de TruoCloud (deberia empezar con tc_live_ o tc_test_).",
          EXIT.USAGE,
        );
      }

      // Se valida ANTES de guardar. Guardar una credencial que no funciona convierte el
      // primer comando real del usuario en un 401 sin explicacion.
      // El tipo sale del contrato (`T.Account`), no de una forma inventada acá: si la API
      // renombrara `email`, esto deja de compilar en vez de imprimir "?" en produccion.
      let account: T.Account;
      try {
        account = await new TruoClient({ token, ...(baseUrl ? { baseUrl } : {}) }).account.get();
      } catch (err) {
        throw toCliError(err);
      }
      await persistToken(profile, token, baseUrl, account);
      return EXIT.OK;
    }

    // ── Camino normal: device flow ──────────────────────────────────────────
    const idpUrl = flagString(ctx.args.flags, "idp") ?? ctx.resolved.idpUrl ?? DEFAULT_IDP_URL;
    const requested = flagString(ctx.args.flags, "scopes");
    const scopes = requested
      ? requested.split(",").map((s) => s.trim()).filter(Boolean)
      : grantableScopes();
    if (scopes.length === 0) {
      throw new CliError("--scopes quedo vacio.", EXIT.USAGE, `Disponibles: ${grantableScopes().join(", ")}`);
    }

    const device = await requestDeviceCode(idpUrl, scopes);

    // El código va a stderr como todo lo interactivo: `truo auth login` puede
    // correr con stdout redirigido y esto no es dato de salida, es instrucción.
    info("");
    info(`  Abri  ${color.cyan(device.verificationUri)}`);
    info(`  Codigo  ${color.bold(device.userCode)}`);
    info("");

    // `--no-browser` llega normalizado como `browser=false` desde el parser.
    const noBrowser = flagBool(ctx.args.flags, "browser") === false;
    if (!noBrowser && device.verificationUriComplete && openBrowser(device.verificationUriComplete)) {
      info(color.dim("Se abrio el navegador. Verifica que el codigo coincida antes de aprobar."));
    } else {
      info(color.dim("Abri esa URL en cualquier navegador (puede ser el de tu telefono)."));
    }
    info(color.dim("Esperando la aprobacion…"));

    const idpToken = await pollForToken(idpUrl, device);

    // El token del IdP alcanza para crear la key y nada más: la API lo acota a
    // `account:read` + `apikeys:*`. Lo que queda guardado es la key.
    const bootstrap = new TruoClient({ token: idpToken, ...(baseUrl ? { baseUrl } : {}) });
    const name = flagString(ctx.args.flags, "name") ?? `truo-cli@${safeHostname()}`;

    let created: T.ApiKeyCreated;
    try {
      created = await bootstrap.apiKeys.create({ name, scopes });
    } catch (err) {
      await signOut(idpUrl, idpToken);
      throw toCliError(err);
    }

    let account: T.Account;
    try {
      account = await new TruoClient({
        token: created.token,
        ...(baseUrl ? { baseUrl } : {}),
      }).account.get();
    } catch (err) {
      await signOut(idpUrl, idpToken);
      throw toCliError(err);
    }

    await persistToken(profile, created.token, baseUrl, account);
    // La sesión del navegador ya no hace falta. Dejarla viva sería dejar tirada
    // una credencial que nadie va a acordarse de revocar.
    await signOut(idpUrl, idpToken);

    info(color.dim(`Key "${name}" (${created.id}) con ${scopes.length} scopes. Revocala con: truo auth token revoke ${created.id}`));
    return EXIT.OK;
  },
};

/** Nombre del equipo, saneado para que entre en el nombre de una key. */
function safeHostname(): string {
  const raw = hostname() || "desconocido";
  return raw.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 40);
}

const authLogout: BuiltinCommand = {
  path: ["auth", "logout"],
  summary: "Borrar la credencial guardada del perfil",
  anonymous: true,
  async run(ctx) {
    const profile = ctx.resolved.profile;
    const removed = deleteToken(profile);
    // Borrar local no revoca: la key sigue siendo valida para quien la tenga. Decirlo
    // evita la falsa sensacion de haber cortado el acceso.
    info(
      removed
        ? `${color.green("Listo.")} Credencial del perfil ${color.bold(profile)} borrada de este equipo.`
        : `El perfil ${color.bold(profile)} no tenia credencial guardada.`,
    );
    info(
      color.yellow(
        "Esto NO revoca la key: si la copiaste a otro lado, sigue funcionando. " +
          "Para revocarla de verdad: truo auth token revoke <key_id>.",
      ),
    );
    return EXIT.OK;
  },
};

const authStatus: BuiltinCommand = {
  path: ["auth", "status"],
  summary: "Quien soy, con que token y contra que API",
  anonymous: true,
  details:
    "Sustituye al comando generado del mismo nombre (GET /v1/account) para poder mostrar " +
    "tambien de donde sale la credencial, que es la mitad de la pregunta cuando algo falla.",
  async run(ctx) {
    const { profile, token, tokenSource, baseUrl } = ctx.resolved;
    const lines = [
      `perfil       ${color.bold(profile)}`,
      `api          ${baseUrl ?? API_BASE_URL}`,
      `credencial   ${token ? `${maskToken(token)} ${color.dim(`(${sourceLabel(tokenSource)})`)}` : color.red("ninguna")}`,
      `config       ${configDir()}`,
    ];
    if (!token) {
      out(lines.join("\n"));
      info("\nNo hay credencial. Corre 'truo auth login'.");
      return EXIT.UNAUTHENTICATED;
    }
    try {
      const account: T.Account = await ctx.client().account.get();
      lines.push(
        `cuenta       ${account.email ?? account.id}`,
        `estado       ${color.green("token valido")}`,
      );
      out(lines.join("\n"));
      return EXIT.OK;
    } catch (err) {
      out(lines.join("\n"));
      throw toCliError(err);
    }
  },
};

function sourceLabel(source: string | null): string {
  return source === "flag" ? "--token" : source === "env" ? "TRUO_TOKEN" : source === "profile" ? "perfil" : "?";
}

// ─────────────────────────────────────────────────────────────────────────────
// config
// ─────────────────────────────────────────────────────────────────────────────

const configList: BuiltinCommand = {
  path: ["config", "list"],
  summary: "Ver los perfiles y sus ajustes",
  anonymous: true,
  async run(ctx) {
    const cfg = loadConfig();
    const format = parseFormat(flagString(ctx.args.flags, "output"));
    if (format !== "table") {
      out(render(cfg, { format }));
      return EXIT.OK;
    }
    const rows = Object.entries(cfg.profiles).map(([name, p]) => ({
      profile: name === cfg.current_profile ? `${name} ${color.green("(activo)")}` : name,
      base_url: p.base_url ?? color.dim(API_BASE_URL),
      output: p.output ?? color.dim("table"),
      account: p.account ?? color.dim("—"),
    }));
    out(render({ object: "list", data: rows }, { format: "table", columns: ["profile", "base_url", "output", "account"] }));
    return EXIT.OK;
  },
};

const configUse: BuiltinCommand = {
  path: ["config", "use"],
  summary: "Cambiar el perfil activo",
  usage: "truo config use <perfil>",
  anonymous: true,
  async run(ctx) {
    const name = ctx.positionals[0];
    if (!name) throw new CliError("Falta el nombre del perfil.", EXIT.USAGE, "Uso: truo config use <perfil>");
    const cfg = loadConfig();
    if (!cfg.profiles[name]) cfg.profiles[name] = {};
    cfg.current_profile = name;
    saveConfig(cfg);
    info(`${color.green("Listo.")} Perfil activo: ${color.bold(name)}.`);
    return EXIT.OK;
  },
};

const configSet: BuiltinCommand = {
  path: ["config", "set"],
  summary: "Ajustar una clave del perfil activo (base_url, idp_url, output)",
  usage: "truo config set <clave> <valor>",
  anonymous: true,
  async run(ctx) {
    const [key, value] = ctx.positionals;
    const allowed = ["base_url", "idp_url", "output"];
    if (!key || value === undefined) {
      throw new CliError("Faltan argumentos.", EXIT.USAGE, `Uso: truo config set <${allowed.join("|")}> <valor>`);
    }
    if (!allowed.includes(key)) {
      throw new CliError(`Clave desconocida: ${key}.`, EXIT.USAGE, `Solo se pueden ajustar: ${allowed.join(", ")}.`);
    }
    if (key === "output") parseFormat(value); // valida antes de escribir
    const cfg = loadConfig();
    const profile = cfg.current_profile;
    cfg.profiles[profile] = { ...(cfg.profiles[profile] ?? {}), [key]: value };
    saveConfig(cfg);
    info(`${color.green("Listo.")} ${profile}.${key} = ${value}`);
    return EXIT.OK;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// api — el escape hatch
// ─────────────────────────────────────────────────────────────────────────────

const apiRaw: BuiltinCommand = {
  path: ["api"],
  summary: "Llamar cualquier endpoint a mano (estilo `gh api`)",
  usage: "truo api <METODO> <ruta> [--body-json '{…}']",
  details:
    "Existe para que nunca haya que esperar una version del CLI para usar algo que la API " +
    "ya expone. No pasa por el arbol generado: no valida argumentos ni pide confirmacion.",
  async run(ctx) {
    const [methodRaw, pathRaw] = ctx.positionals;
    if (!methodRaw || !pathRaw) {
      throw new CliError("Faltan argumentos.", EXIT.USAGE, "Uso: truo api GET /v1/vps");
    }
    const method = methodRaw.toUpperCase();
    const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
    const base = (ctx.resolved.baseUrl ?? API_BASE_URL).replace(/\/+$/, "");
    const bodyJson = flagString(ctx.args.flags, "body-json");

    if (["DELETE", "POST", "PUT", "PATCH"].includes(method) && !flagBool(ctx.args.flags, "yes")) {
      const ok = await confirm(`${color.yellow(method)} ${base}${path} — llamada cruda, sin validar.`);
      if (!ok) return EXIT.ABORTED;
    }

    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${ctx.resolved.token}`,
        accept: "application/json",
        ...(bodyJson ? { "content-type": "application/json" } : {}),
      },
      ...(bodyJson ? { body: bodyJson } : {}),
    });

    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* No todo lo que responde un endpoint es JSON; se imprime crudo. */
    }

    const requestId = res.headers.get("x-request-id");
    if (requestId) info(color.dim(`x-request-id: ${requestId}`));
    out(render(data, { format: parseFormat(flagString(ctx.args.flags, "output"), "json") }));
    return res.ok ? EXIT.OK : EXIT.API_ERROR;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// completion / mcp
// ─────────────────────────────────────────────────────────────────────────────

const completion: BuiltinCommand = {
  path: ["completion"],
  summary: "Imprimir el script de autocompletado (bash | zsh | fish)",
  usage: "truo completion <bash|zsh|fish>",
  anonymous: true,
  async run(ctx) {
    const shell = ctx.positionals[0];
    // Los grupos y comandos salen del arbol generado, asi que el autocompletado tampoco
    // puede quedar viejo respecto de la API.
    const groups = [...new Set(COMMANDS.map((c) => c.path[0]!))].sort();
    const byGroup = groups.map((g) => ({
      g,
      subs: [...new Set(COMMANDS.filter((c) => c.path[0] === g).map((c) => c.path.slice(1).join(" ")))],
    }));

    switch (shell) {
      case "bash":
        out(`# truo bash completion — agregalo a ~/.bashrc:  eval "$(truo completion bash)"
_truo() {
  local cur prev
  cur="\${COMP_WORDS[COMP_CWORD]}"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${groups.join(" ")} auth config api completion mcp help" -- "$cur") )
    return
  fi
  prev="\${COMP_WORDS[1]}"
  case "$prev" in
${byGroup.map((b) => `    ${b.g}) COMPREPLY=( $(compgen -W "${b.subs.map((s) => s.split(" ")[0]).join(" ")}" -- "$cur") );;`).join("\n")}
    auth) COMPREPLY=( $(compgen -W "login logout status token" -- "$cur") );;
    config) COMPREPLY=( $(compgen -W "list use set" -- "$cur") );;
  esac
}
complete -F _truo truo`);
        return EXIT.OK;
      case "zsh":
        out(`# truo zsh completion — agregalo a ~/.zshrc:  eval "$(truo completion zsh)"
_truo() {
  local -a groups
  groups=(${groups.map((g) => `'${g}'`).join(" ")} 'auth' 'config' 'api' 'completion' 'mcp')
  if (( CURRENT == 2 )); then compadd -a groups; return; fi
  case "\${words[2]}" in
${byGroup.map((b) => `    ${b.g}) compadd ${[...new Set(b.subs.map((s) => s.split(" ")[0]))].join(" ")};;`).join("\n")}
    auth) compadd login logout status token;;
    config) compadd list use set;;
  esac
}
compdef _truo truo`);
        return EXIT.OK;
      case "fish":
        out(
          [
            "# truo fish completion — guardalo en ~/.config/fish/completions/truo.fish",
            ...groups.map((g) => `complete -c truo -n "__fish_use_subcommand" -a "${g}"`),
            ...byGroup.flatMap((b) =>
              [...new Set(b.subs.map((s) => s.split(" ")[0]))].map(
                (s) => `complete -c truo -n "__fish_seen_subcommand_from ${b.g}" -a "${s}"`,
              ),
            ),
          ].join("\n"),
        );
        return EXIT.OK;
      default:
        throw new CliError("Shell no soportado.", EXIT.USAGE, "Uso: truo completion <bash|zsh|fish>");
    }
  },
};

const mcp: BuiltinCommand = {
  path: ["mcp"],
  summary: "Servidor MCP para agentes de IA (todavia no disponible)",
  anonymous: true,
  async run() {
    // Se declara y falla en vez de no existir: que el comando este ausente hace pensar que
    // la version del CLI esta vieja. Que exista y diga "todavia no" es informacion.
    throw new CliError(
      "El servidor MCP todavia no esta implementado.",
      EXIT.USAGE,
      "Es la fase 4 del devkit. Mientras tanto, un agente puede usar la API directo: el " +
        "OpenAPI esta en https://api.truo.cloud/v1/openapi.json y describe cada operacion " +
        "con su toolset, su accion y si es de solo lectura.",
    );
  },
};

export const BUILTINS: BuiltinCommand[] = [
  authLogin,
  authLogout,
  authStatus,
  configList,
  configUse,
  configSet,
  apiRaw,
  completion,
  mcp,
];
