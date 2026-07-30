/**
 * The commands that do NOT come from the OpenAPI spec.
 *
 * These are the ones with no matching endpoint: local credential management, profiles,
 * the raw call and shell completion. Everything else is generated, and this list is kept
 * short on purpose — every hand-written command is one that can drift out of sync with
 * the API.
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
  /** Already-authenticated client. Throws if there is no credential: builtins that do not need one never ask for it. */
  client: () => TruoClient;
  resolved: ReturnType<typeof resolve>;
}

export interface BuiltinCommand extends Builtin {
  /** `true` if the command works without a credential (login, config, completion). */
  anonymous?: boolean;
  run: (ctx: BuiltinContext) => Promise<number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stores an already-validated key and leaves the profile ready. Shared by both
 * login paths (device flow and `--token`) so there is no way for one to write
 * something different from the other.
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
    `${color.green("Done.")} Profile ${color.bold(profile)} authenticated as ` +
      `${color.bold(account.email ?? account.id ?? "?")} — token ${maskToken(token)}.`,
  );
  info(color.dim(`Saved to ${path}`));
  if (warning) info(color.yellow(warning));
}

const authLogin: BuiltinCommand = {
  path: ["auth", "login"],
  summary: "Sign in with the browser and create this machine's API key",
  usage: "truo auth login [--scopes a,b] [--no-browser] | truo auth login --token <key>",
  anonymous: true,
  details:
    "By default it opens a browser login (device flow, RFC 8628) and creates an API key " +
    "of this machine's own. The key is the credential that gets stored: it can be revoked " +
    "from the panel without touching anything else, and the browser session is closed as soon as it finishes.\n\n" +
    "--token <key>   Use a key already created in the panel, no browser (for CI and bastion hosts).\n" +
    "--scopes a,b    Narrow the key. By default it requests everything the CLI can use.\n" +
    "--no-browser    Do not try to open the browser; just print the URL.\n" +
    "--name <n>      Name of the key in the panel (defaults to truo-cli@<machine>).",
  async run(ctx) {
    const profile = ctx.resolved.profile;
    const baseUrl = ctx.resolved.baseUrl;
    const explicitToken = flagString(ctx.args.flags, "token");

    // ── Short path: a key that already exists ───────────────────────────────
    // A bare `--token` (no value) also lands here: whoever typed it wants to
    // paste a key, not open a browser.
    if (ctx.args.flags.has("token") || flagBool(ctx.args.flags, "paste") === true) {
      let token = explicitToken;
      if (!token) {
        if (!isInteractive()) {
          throw new CliError(
            "Cannot prompt for the token without an interactive terminal.",
            EXIT.UNAUTHENTICATED,
            "Pass it with --token, or set TRUO_TOKEN in your CI.",
          );
        }
        info(`Create an API key at ${color.cyan("https://consola.truocloud.com/settings/api-keys")} and paste it here.`);
        info(color.dim("It is not shown while you type."));
        token = await askSecret("Token: ");
      }
      if (!token) throw new CliError("No token was entered.", EXIT.UNAUTHENTICATED);
      if (!/^tc_(live|test)_/.test(token)) {
        throw new CliError(
          "That does not look like a TruoCloud API key (it should start with tc_live_ or tc_test_).",
          EXIT.USAGE,
        );
      }

      // Validated BEFORE saving. Storing a credential that does not work turns the
      // user's first real command into an unexplained 401.
      // The type comes from the contract (`T.Account`), not from a shape invented here:
      // if the API renamed `email`, this stops compiling instead of printing "?" in production.
      let account: T.Account;
      try {
        account = await new TruoClient({ token, ...(baseUrl ? { baseUrl } : {}) }).account.get();
      } catch (err) {
        throw toCliError(err);
      }
      await persistToken(profile, token, baseUrl, account);
      return EXIT.OK;
    }

    // ── Normal path: device flow ────────────────────────────────────────────
    const idpUrl = flagString(ctx.args.flags, "idp") ?? ctx.resolved.idpUrl ?? DEFAULT_IDP_URL;
    const requested = flagString(ctx.args.flags, "scopes");
    const scopes = requested
      ? requested.split(",").map((s) => s.trim()).filter(Boolean)
      : grantableScopes();
    if (scopes.length === 0) {
      throw new CliError("--scopes ended up empty.", EXIT.USAGE, `Available: ${grantableScopes().join(", ")}`);
    }

    const device = await requestDeviceCode(idpUrl, scopes);

    // The code goes to stderr like everything interactive: `truo auth login` may
    // run with stdout redirected, and this is not output data, it is an instruction.
    info("");
    info(`  Open  ${color.cyan(device.verificationUri)}`);
    info(`  Code  ${color.bold(device.userCode)}`);
    info("");

    // `--no-browser` arrives normalized as `browser=false` from the parser.
    const noBrowser = flagBool(ctx.args.flags, "browser") === false;
    if (!noBrowser && device.verificationUriComplete && openBrowser(device.verificationUriComplete)) {
      info(color.dim("Browser opened. Check that the code matches before approving."));
    } else {
      info(color.dim("Open that URL in any browser (your phone's works too)."));
    }
    info(color.dim("Waiting for approval…"));

    const idpToken = await pollForToken(idpUrl, device);

    // The IdP token is enough to create the key and nothing more: the API scopes
    // it down to `account:read` + `apikeys:*`. What gets stored is the key.
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
    // The browser session is no longer needed. Leaving it alive would be leaving
    // behind a credential nobody will remember to revoke.
    await signOut(idpUrl, idpToken);

    info(color.dim(`Key "${name}" (${created.id}) with ${scopes.length} scopes. Revoke it with: truo auth token revoke ${created.id}`));
    return EXIT.OK;
  },
};

/** Machine name, sanitized so it fits inside a key name. */
function safeHostname(): string {
  const raw = hostname() || "unknown";
  return raw.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 40);
}

const authLogout: BuiltinCommand = {
  path: ["auth", "logout"],
  summary: "Delete the profile's stored credential",
  anonymous: true,
  async run(ctx) {
    const profile = ctx.resolved.profile;
    const removed = deleteToken(profile);
    // Deleting locally does not revoke: the key remains valid for whoever has it.
    // Saying so avoids the false sense of having cut off access.
    info(
      removed
        ? `${color.green("Done.")} Credential for profile ${color.bold(profile)} deleted from this machine.`
        : `Profile ${color.bold(profile)} had no stored credential.`,
    );
    info(
      color.yellow(
        "This does NOT revoke the key: if you copied it elsewhere, it still works. " +
          "To truly revoke it: truo auth token revoke <key_id>.",
      ),
    );
    return EXIT.OK;
  },
};

const authStatus: BuiltinCommand = {
  path: ["auth", "status"],
  summary: "Who am I, with which token, against which API",
  anonymous: true,
  details:
    "Replaces the generated command of the same name (GET /v1/account) so it can also show " +
    "where the credential comes from, which is half the question when something fails.",
  async run(ctx) {
    const { profile, token, tokenSource, baseUrl } = ctx.resolved;
    const lines = [
      `profile      ${color.bold(profile)}`,
      `api          ${baseUrl ?? API_BASE_URL}`,
      `credential   ${token ? `${maskToken(token)} ${color.dim(`(${sourceLabel(tokenSource)})`)}` : color.red("none")}`,
      `config       ${configDir()}`,
    ];
    if (!token) {
      out(lines.join("\n"));
      info("\nNo credential found. Run 'truo auth login'.");
      return EXIT.UNAUTHENTICATED;
    }
    try {
      const account: T.Account = await ctx.client().account.get();
      lines.push(
        `account      ${account.email ?? account.id}`,
        `status       ${color.green("token valid")}`,
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
  return source === "flag" ? "--token" : source === "env" ? "TRUO_TOKEN" : source === "profile" ? "profile" : "?";
}

// ─────────────────────────────────────────────────────────────────────────────
// config
// ─────────────────────────────────────────────────────────────────────────────

const configList: BuiltinCommand = {
  path: ["config", "list"],
  summary: "Show profiles and their settings",
  anonymous: true,
  async run(ctx) {
    const cfg = loadConfig();
    const format = parseFormat(flagString(ctx.args.flags, "output"));
    if (format !== "table") {
      out(render(cfg, { format }));
      return EXIT.OK;
    }
    const rows = Object.entries(cfg.profiles).map(([name, p]) => ({
      profile: name === cfg.current_profile ? `${name} ${color.green("(active)")}` : name,
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
  summary: "Switch the active profile",
  usage: "truo config use <profile>",
  anonymous: true,
  async run(ctx) {
    const name = ctx.positionals[0];
    if (!name) throw new CliError("Missing profile name.", EXIT.USAGE, "Usage: truo config use <profile>");
    const cfg = loadConfig();
    if (!cfg.profiles[name]) cfg.profiles[name] = {};
    cfg.current_profile = name;
    saveConfig(cfg);
    info(`${color.green("Done.")} Active profile: ${color.bold(name)}.`);
    return EXIT.OK;
  },
};

const configSet: BuiltinCommand = {
  path: ["config", "set"],
  summary: "Set a key on the active profile (base_url, idp_url, output)",
  usage: "truo config set <key> <value>",
  anonymous: true,
  async run(ctx) {
    const [key, value] = ctx.positionals;
    const allowed = ["base_url", "idp_url", "output"];
    if (!key || value === undefined) {
      throw new CliError("Missing arguments.", EXIT.USAGE, `Usage: truo config set <${allowed.join("|")}> <value>`);
    }
    if (!allowed.includes(key)) {
      throw new CliError(`Unknown key: ${key}.`, EXIT.USAGE, `Only these can be set: ${allowed.join(", ")}.`);
    }
    if (key === "output") parseFormat(value); // validate before writing
    const cfg = loadConfig();
    const profile = cfg.current_profile;
    cfg.profiles[profile] = { ...(cfg.profiles[profile] ?? {}), [key]: value };
    saveConfig(cfg);
    info(`${color.green("Done.")} ${profile}.${key} = ${value}`);
    return EXIT.OK;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// api — the escape hatch
// ─────────────────────────────────────────────────────────────────────────────

const apiRaw: BuiltinCommand = {
  path: ["api"],
  summary: "Call any endpoint by hand (`gh api` style)",
  usage: "truo api <METHOD> <path> [--body-json '{…}']",
  details:
    "Exists so nobody ever has to wait for a CLI release to use something the API " +
    "already exposes. It does not go through the generated tree: no argument validation, no confirmation prompt.",
  async run(ctx) {
    const [methodRaw, pathRaw] = ctx.positionals;
    if (!methodRaw || !pathRaw) {
      throw new CliError("Missing arguments.", EXIT.USAGE, "Usage: truo api GET /v1/vps");
    }
    const method = methodRaw.toUpperCase();
    const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
    const base = (ctx.resolved.baseUrl ?? API_BASE_URL).replace(/\/+$/, "");
    const bodyJson = flagString(ctx.args.flags, "body-json");

    if (["DELETE", "POST", "PUT", "PATCH"].includes(method) && !flagBool(ctx.args.flags, "yes")) {
      const ok = await confirm(`${color.yellow(method)} ${base}${path} — raw call, no validation.`);
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
      /* Not everything an endpoint returns is JSON; print it raw. */
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
  summary: "Print the shell completion script (bash | zsh | fish)",
  usage: "truo completion <bash|zsh|fish>",
  anonymous: true,
  async run(ctx) {
    const shell = ctx.positionals[0];
    // Groups and commands come from the generated tree, so completion cannot go
    // stale relative to the API either.
    const groups = [...new Set(COMMANDS.map((c) => c.path[0]!))].sort();
    const byGroup = groups.map((g) => ({
      g,
      subs: [...new Set(COMMANDS.filter((c) => c.path[0] === g).map((c) => c.path.slice(1).join(" ")))],
    }));

    switch (shell) {
      case "bash":
        out(`# truo bash completion — add it to ~/.bashrc:  eval "$(truo completion bash)"
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
        out(`# truo zsh completion — add it to ~/.zshrc:  eval "$(truo completion zsh)"
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
            "# truo fish completion — save it to ~/.config/fish/completions/truo.fish",
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
        throw new CliError("Unsupported shell.", EXIT.USAGE, "Usage: truo completion <bash|zsh|fish>");
    }
  },
};

const mcpServeCmd: BuiltinCommand = {
  path: ["mcp", "serve"],
  summary: "MCP server on stdio for AI agents (read-only by default)",
  usage: "truo mcp serve [--allow vps:write,dns:write] [--toolsets vps,dns]",
  details:
    "Write actions are OMITTED from the catalog unless their scope is in --allow: what a " +
    "model cannot name, a prompt injection cannot request. Destructive actions always " +
    "require a human-approved confirmation token, and credentials come back as secret_ref " +
    "values only a human can redeem with 'truo secret reveal'.",
  async run(ctx) {
    const { mcpServe } = await import("./mcp/command.ts");
    return mcpServe(ctx);
  },
};

const mcpInspectCmd: BuiltinCommand = {
  path: ["mcp", "inspect"],
  summary: "Print the MCP catalog a session would expose, with its fingerprint",
  usage: "truo mcp inspect [--allow …] [--toolsets …]",
  anonymous: true,
  async run(ctx) {
    const { mcpInspect } = await import("./mcp/command.ts");
    return mcpInspect(ctx);
  },
};

const mcpInstallCmd: BuiltinCommand = {
  path: ["mcp", "install"],
  summary: "Register the server with an MCP client",
  usage: "truo mcp install <claude|claude-code|cursor|vscode> [--allow …]",
  anonymous: true,
  async run(ctx) {
    const { mcpInstall } = await import("./mcp/command.ts");
    return mcpInstall(ctx);
  },
};

const secretReveal: BuiltinCommand = {
  path: ["secret", "reveal"],
  summary: "Redeem a secret_ref produced by the MCP server (single use, 15 min TTL)",
  usage: "truo secret reveal <sr_…>",
  anonymous: true,
  async run(ctx) {
    const ref = ctx.positionals[0];
    if (!ref || !ref.startsWith("sr_")) {
      throw new CliError("Which ref?", EXIT.USAGE, "Usage: truo secret reveal <sr_…>");
    }
    const { revealSecretRef } = await import("./mcp/scrub.ts");
    const value = revealSecretRef(ref);
    if (value === null) {
      throw new CliError(
        "That ref does not exist, expired, or was already revealed.",
        EXIT.NOT_FOUND,
        "Refs are single-use and live 15 minutes. Re-run the action that produced it.",
      );
    }
    // The value goes to stdout alone so it can be piped; the warning goes to stderr.
    info("This ref is now consumed. Store the value where it belongs.");
    out(value);
    return EXIT.OK;
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
  mcpServeCmd,
  mcpInspectCmd,
  mcpInstallCmd,
  secretReveal,
];
