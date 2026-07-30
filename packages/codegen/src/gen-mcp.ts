/**
 * Generates the MCP toolset catalog for `truo mcp serve`.
 *
 * One tool per family with an `action` enum — not one tool per operation (103 tools
 * drown a model's context) and not a generic `call(operation, args)` executor (that is
 * the confused deputy: no per-action schema validation, no per-action danger gating,
 * and any prompt injection becomes "call whatever you want"). The middle ground is a
 * catalog the server can validate and gate action by action.
 *
 * Everything here is derived from the spec at generation time. Tool and action
 * descriptions are static — never built from customer data — so a hostile value in
 * some resource name can never rewrite what the model believes a tool does.
 */
import { resolve } from "node:path";
import type { OpIR } from "./ir.ts";
import { BANNER, writeGenerated, type WriteResult } from "./util.ts";

const CLI = (f: string) => resolve(import.meta.dirname, "../../cli/src/generated", f);

/**
 * Structural tenant isolation: no MCP-exposed operation may accept an account or
 * user identifier. The API is credential-scoped by design; if one of these ever
 * appears in the spec, exposing it to a model would let an injected prompt try to
 * reach across tenants, so the build fails instead.
 */
const FORBIDDEN_PARAMS = new Set(["account_id", "client_id", "user_id", "userid", "clientid"]);

export function genMcp(ops: OpIR[], check: boolean): WriteResult[] {
  const exposed = ops.filter((op) => op.mcp !== null);

  const toolsets = new Map<string, OpIR[]>();
  const metaOps: OpIR[] = [];
  for (const op of exposed) {
    const { toolset } = op.mcp!;
    for (const p of [...op.pathParams, ...op.queryParams]) {
      if (FORBIDDEN_PARAMS.has(p.name.toLowerCase())) {
        throw new Error(
          `${op.id}: parameter "${p.name}" must not be exposed over MCP (tenant isolation is structural). ` +
            `Fix the operation in the API or drop its x-truo-mcp.`,
        );
      }
    }
    // `meta` and `services` power the hand-written meta-tools (truo_whoami,
    // truo_services, truo_operation); they are not family tools.
    if (toolset === "meta" || toolset === "services") {
      metaOps.push(op);
      continue;
    }
    const list = toolsets.get(toolset) ?? [];
    list.push(op);
    toolsets.set(toolset, list);
  }

  const lines: string[] = [BANNER];
  lines.push(`import type { JsonSchema } from "../../../openapi/src/index.ts";\n`);
  lines.push(`export interface McpActionSpec {
  operationId: string;
  summary: string;
  danger: "none" | "reversible" | "destructive";
  /** Read-only actions are the only ones exposed unless the scope is in --allow. */
  readonly: boolean;
  scope: string | null;
  longRunning: boolean;
  /** Path parameter names, in URL order. The first one is filled by \`service_id\`. */
  pathParams: string[];
  queryParams: { name: string; required: boolean; schema: JsonSchema }[];
  bodySchema: JsonSchema | null;
  bodyRequired: boolean;
}

export interface McpToolsetSpec {
  /** Tool name as the model sees it: \`truo_<toolset>\`. */
  tool: string;
  actions: Record<string, McpActionSpec>;
}
`);

  const emitAction = (op: OpIR): string => {
    const spec = {
      operationId: op.id,
      summary: op.summary,
      danger: op.danger,
      readonly: op.mcp!.readonly,
      scope: op.scope,
      longRunning: op.longRunning,
      pathParams: op.pathParams.map((p) => p.name),
      queryParams: op.queryParams.map((p) => ({ name: p.name, required: p.required, schema: p.schema })),
      bodySchema: op.body?.schema ?? null,
      bodyRequired: op.body?.required ?? false,
    };
    return JSON.stringify(spec);
  };

  lines.push(`/** Family tools: one per product family, dispatched by \`action\`. */`);
  lines.push(`export const TOOLSETS: Record<string, McpToolsetSpec> = {`);
  for (const [name, list] of [...toolsets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const seen = new Set<string>();
    lines.push(`  ${JSON.stringify(name)}: {`);
    lines.push(`    tool: ${JSON.stringify(`truo_${name}`)},`);
    lines.push(`    actions: {`);
    for (const op of list.sort((a, b) => a.mcp!.action.localeCompare(b.mcp!.action))) {
      const action = op.mcp!.action;
      if (seen.has(action)) {
        throw new Error(`Toolset "${name}" declares the action "${action}" twice (${op.id}). Fix x-truo-mcp in the API.`);
      }
      seen.add(action);
      lines.push(`      ${JSON.stringify(action)}: ${emitAction(op)},`);
    }
    lines.push(`    },`);
    lines.push(`  },`);
  }
  lines.push(`};\n`);

  lines.push(`/** Operations behind the meta-tools (whoami, services, operation). */`);
  lines.push(`export const META_OPS: Record<string, McpActionSpec> = {`);
  for (const op of metaOps.sort((a, b) => a.id.localeCompare(b.id))) {
    lines.push(`  ${JSON.stringify(op.id)}: ${emitAction(op)},`);
  }
  lines.push(`};`);

  return [writeGenerated(CLI("toolsets.ts"), lines.join("\n"), check)];
}
