/**
 * Builds the session catalog: the tools this MCP server actually exposes.
 *
 * Two filters compose:
 *
 * 1. **Entitlement** — a family the account does not have is not shown at all. An
 *    account with one VPS sees 5 tools, not 11; that is real context the model gets
 *    back, and one less thing to hallucinate about.
 * 2. **Read-only by default** — write actions are not rejected, they are OMITTED from
 *    the action enum, so the model never sees them. `--allow vps:write,dns:*` is what
 *    puts them on the table. A capability a model cannot name is a capability a prompt
 *    injection cannot request.
 *
 * Everything the model reads here (names, descriptions, schemas) is generated from our
 * spec at build time — never from customer data.
 */
import { createHash } from "node:crypto";
import { TOOLSETS, type McpActionSpec } from "../generated/toolsets.ts";
import { canonicalJson } from "./confirm.ts";

export interface SessionOptions {
  /** Scopes whose write actions are exposed (`vps:write`, `dns:*`). Empty = read-only. */
  allow: string[];
  /** Restrict to these toolsets regardless of entitlement. Empty = all entitled. */
  toolsets: string[];
  /** Families the account actually has, or null if the probe failed (expose all). */
  entitled: string[] | null;
}

export interface ExposedAction extends McpActionSpec {
  action: string;
}

export interface ExposedTool {
  name: string;
  toolset: string;
  description: string;
  inputSchema: Record<string, unknown>;
  actions: Map<string, ExposedAction>;
}

export function scopeAllowed(scope: string | null, allow: string[]): boolean {
  if (scope === null) return true;
  const [resource] = scope.split(":");
  return allow.some((a) => a === scope || a === `${resource}:*` || a === "*");
}

function actionExposed(spec: McpActionSpec, allow: string[]): boolean {
  return spec.readonly || scopeAllowed(spec.scope, allow);
}

/** `svc_10432` etc. The label mirrors what the API path calls it. */
function humanParams(spec: McpActionSpec): string {
  const parts: string[] = [];
  const [first, ...restPath] = spec.pathParams;
  if (first !== undefined) parts.push("service_id");
  for (const p of restPath) parts.push(`params.${p}`);
  for (const q of spec.queryParams) parts.push(`params.${q.name}${q.required ? "" : "?"}`);
  const body = spec.bodySchema?.properties ?? {};
  const requiredBody = new Set(spec.bodySchema?.required ?? []);
  for (const key of Object.keys(body)) parts.push(`params.${key}${requiredBody.has(key) ? "" : "?"}`);
  return parts.length ? ` Args: ${parts.join(", ")}.` : "";
}

function toolDescription(toolset: string, actions: Map<string, ExposedAction>): string {
  const lines = [
    `Operate ${toolset} services on this TruoCloud account. ` +
      `Pick one \`action\`; pass its arguments in \`params\` (and \`service_id\` where noted). ` +
      `Get service ids from truo_services first.`,
    ``,
    `Actions:`,
  ];
  for (const [name, a] of actions) {
    const marks = [
      a.danger === "destructive" ? "DESTRUCTIVE — requires confirmation_token" : "",
      a.danger === "reversible" ? "write" : "",
      a.longRunning ? "async" : "",
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`- ${name}: ${a.summary}${marks ? ` [${marks}]` : ""}.${humanParams(a)}`);
  }
  return lines.join("\n");
}

function toolInputSchema(actions: Map<string, ExposedAction>): Record<string, unknown> {
  const needsService = [...actions.values()].some((a) => a.pathParams.length > 0);
  const hasDestructive = [...actions.values()].some((a) => a.danger === "destructive");
  return {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [...actions.keys()],
        description: "Which operation to perform. See the tool description for each action's arguments.",
      },
      ...(needsService
        ? {
            service_id: {
              type: "string",
              description: "Target service id (svc_…). List them with truo_services.",
            },
          }
        : {}),
      params: {
        type: "object",
        description: "Action-specific arguments, flat. Unknown keys are rejected with the list of valid ones.",
        additionalProperties: true,
      },
      ...(hasDestructive
        ? {
            confirmation_token: {
              type: "string",
              description:
                "Only for destructive actions: token returned by the first call. " +
                "Calling without it returns a summary and the token instead of executing.",
            },
          }
        : {}),
    },
    required: ["action"],
    additionalProperties: false,
  };
}

export function buildCatalog(options: SessionOptions): Map<string, ExposedTool> {
  const tools = new Map<string, ExposedTool>();

  for (const [toolset, spec] of Object.entries(TOOLSETS)) {
    if (options.toolsets.length && !options.toolsets.includes(toolset)) continue;
    if (!options.toolsets.length && options.entitled !== null && !options.entitled.includes(toolset)) continue;

    const actions = new Map<string, ExposedAction>();
    for (const [name, action] of Object.entries(spec.actions)) {
      if (actionExposed(action, options.allow)) actions.set(name, { ...action, action: name });
    }
    if (!actions.size) continue;

    tools.set(spec.tool, {
      name: spec.tool,
      toolset,
      description: toolDescription(toolset, actions),
      inputSchema: toolInputSchema(actions),
      actions,
    });
  }
  return tools;
}

/**
 * sha256 over the canonical JSON of everything the model can see. Reported by
 * truo_whoami, by `truo mcp inspect`, and stamped on audit output: a catalog that
 * changed under a session's feet stops being a silent event.
 */
export function catalogFingerprint(tools: Map<string, ExposedTool>, extraTools: { name: string; description: string; inputSchema: unknown }[]): string {
  const surface = [
    ...[...tools.values()].map((t) => ({ name: t.name, description: t.description, schema: t.inputSchema })),
    ...extraTools.map((t) => ({ name: t.name, description: t.description, schema: t.inputSchema })),
  ].sort((a, b) => a.name.localeCompare(b.name));
  return "sha256:" + createHash("sha256").update(canonicalJson(surface)).digest("hex").slice(0, 24);
}
