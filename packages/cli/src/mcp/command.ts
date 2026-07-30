/**
 * `truo mcp serve | inspect | install` — the CLI face of the MCP server.
 *
 * The auth is the CLI profile on purpose: the token never enters the MCP client's
 * config file, because those JSON files get committed with a frequency that would
 * embarrass everyone involved.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import type { TruoClient } from "../../../sdk/src/index.ts";
import { TOOLSETS } from "../generated/toolsets.ts";
import type { BuiltinContext } from "../builtins.ts";
import { CliError, EXIT } from "../exit.ts";
import { color, info, out } from "../output.ts";
import { flagString } from "../args.ts";
import { buildCatalog, catalogFingerprint, scopeAllowed, type SessionOptions } from "./catalog.ts";
import { createMcpHandlers, metaToolSurface } from "./server.ts";
import { serveRpc } from "./rpc.ts";
import pkg from "../../package.json";

function parseList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSessionFlags(ctx: BuiltinContext): { allow: string[]; toolsets: string[] } {
  const allow = parseList(flagString(ctx.args.flags, "allow"));
  const toolsets = parseList(flagString(ctx.args.flags, "toolsets"));

  for (const scope of allow) {
    if (scope === "*") {
      throw new CliError(
        "--allow '*' is not accepted.",
        EXIT.USAGE,
        "Name the write scopes the agent really needs, e.g. --allow vps:write,dns:write. " +
          "A blanket grant defeats the point of a read-only default.",
      );
    }
    const [resource] = scope.split(":");
    if (!resource || !(resource in TOOLSETS)) {
      throw new CliError(
        `--allow ${scope}: unknown resource "${resource ?? scope}".`,
        EXIT.USAGE,
        `Available: ${Object.keys(TOOLSETS).join(", ")}.`,
      );
    }
  }
  for (const t of toolsets) {
    if (!(t in TOOLSETS)) {
      throw new CliError(`--toolsets ${t}: unknown toolset.`, EXIT.USAGE, `Available: ${Object.keys(TOOLSETS).join(", ")}.`);
    }
  }
  return { allow, toolsets };
}

/**
 * Which families does this account actually have? A family the account lacks is a tool
 * the model never sees. If the probe fails we expose everything rather than nothing:
 * visibility is not authorization — every real call still authenticates.
 */
async function probeEntitlements(client: TruoClient): Promise<string[] | null> {
  try {
    const res = await client.request<{ data?: { family?: string }[] }>("services.list", {
      queryKeys: ["limit"],
      params: { limit: 100 },
    });
    const families = new Set<string>();
    for (const svc of res.data?.data ?? []) {
      if (svc.family && svc.family in TOOLSETS) families.add(svc.family);
    }
    // DNS zones exist independently of "a DNS service" on some accounts; if the
    // account has any zone, the tool earns its place.
    if (!families.has("dns")) {
      try {
        const zones = await client.request<{ data?: unknown[] }>("dns.zones.list", {
          queryKeys: ["limit"],
          params: { limit: 1 },
        });
        if ((zones.data?.data ?? []).length > 0) families.add("dns");
      } catch {
        // No zones or no permission: the probe already did its best.
      }
    }
    return [...families];
  } catch {
    return null;
  }
}

export async function mcpServe(ctx: BuiltinContext): Promise<number> {
  const { allow, toolsets } = parseSessionFlags(ctx);
  const client = ctx.client();

  const entitled = toolsets.length ? null : await probeEntitlements(client);
  const session = { client, allow, toolsets, entitled, serverVersion: pkg.version };
  const { handlers, context } = createMcpHandlers(session);

  // Humans read stderr; stdout belongs to the protocol.
  process.stderr.write(
    `truo mcp: ${allow.length ? `writes allowed for ${allow.join(", ")}` : "READ-ONLY"} · ` +
      `tools: ${[...context.tools.keys()].join(", ") || "(none beyond meta)"} · ` +
      `${context.fingerprint}\n`,
  );

  await serveRpc(handlers);
  return EXIT.OK;
}

export async function mcpInspect(ctx: BuiltinContext): Promise<number> {
  const { allow, toolsets } = parseSessionFlags(ctx);
  // Inspect is offline on purpose: it answers "what WOULD this session expose",
  // without needing a credential. Entitlement filtering is shown as "all".
  const options: SessionOptions = { allow, toolsets, entitled: null };
  const tools = buildCatalog(options);

  for (const tool of tools.values()) {
    out(`${color.bold(tool.name)}`);
    for (const [name, action] of tool.actions) {
      const marks = [
        action.danger === "destructive" ? color.red("destructive") : "",
        !action.readonly && action.danger !== "destructive" ? color.yellow("write") : "",
        action.longRunning ? "async" : "",
      ]
        .filter(Boolean)
        .join(", ");
      out(`  ${name.padEnd(24)} ${action.summary}${marks ? `  [${marks}]` : ""}`);
    }
  }
  out("");
  out(`Read-only: ${allow.length ? `no (${allow.join(", ")})` : "yes"}`);
  out(`Fingerprint: ${catalogFingerprint(tools, metaToolSurface())}`);
  return EXIT.OK;
}

// ── install ──────────────────────────────────────────────────────────────────

function serveArgs(allow: string[], toolsets: string[]): string[] {
  return [
    "mcp",
    "serve",
    ...(allow.length ? ["--allow", allow.join(",")] : []),
    ...(toolsets.length ? ["--toolsets", toolsets.join(",")] : []),
  ];
}

function mergeJsonFile(path: string, mutate: (data: Record<string, unknown>) => void): void {
  let data: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      data = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    } catch {
      throw new CliError(`${path} exists but is not valid JSON.`, EXIT.INTERNAL, "Fix or remove it and retry.");
    }
  }
  mutate(data);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function mcpInstall(ctx: BuiltinContext): Promise<number> {
  const target = ctx.positionals[0];
  const { allow, toolsets } = parseSessionFlags(ctx);
  const args = serveArgs(allow, toolsets);
  const entry = { command: "truo", args };

  switch (target) {
    case "claude": {
      const base =
        platform() === "win32"
          ? join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Claude")
          : platform() === "darwin"
            ? join(homedir(), "Library", "Application Support", "Claude")
            : join(homedir(), ".config", "Claude");
      const path = join(base, "claude_desktop_config.json");
      mergeJsonFile(path, (data) => {
        const servers = (data.mcpServers ??= {}) as Record<string, unknown>;
        servers.truo = entry;
      });
      info(`${color.green("Done.")} Wrote ${path}. Restart Claude Desktop to pick it up.`);
      return EXIT.OK;
    }
    case "claude-code":
      // Claude Code manages its own config; printing the exact command beats
      // guessing where its settings live this month.
      out(`claude mcp add truo -- truo ${args.join(" ")}`);
      return EXIT.OK;
    case "cursor": {
      const path = join(homedir(), ".cursor", "mcp.json");
      mergeJsonFile(path, (data) => {
        const servers = (data.mcpServers ??= {}) as Record<string, unknown>;
        servers.truo = entry;
      });
      info(`${color.green("Done.")} Wrote ${path}.`);
      return EXIT.OK;
    }
    case "vscode": {
      const path = join(process.cwd(), ".vscode", "mcp.json");
      mergeJsonFile(path, (data) => {
        const servers = (data.servers ??= {}) as Record<string, unknown>;
        servers.truo = { type: "stdio", ...entry };
      });
      info(`${color.green("Done.")} Wrote ${path} (workspace-local).`);
      return EXIT.OK;
    }
    default:
      throw new CliError(
        "Which client?",
        EXIT.USAGE,
        "Usage: truo mcp install <claude|claude-code|cursor|vscode> [--allow …] [--toolsets …]",
      );
  }
}

export { scopeAllowed };
