/**
 * Intermediate representation: the OpenAPI spec flattened to what the generators need.
 *
 * It exists so `gen-sdk` and `gen-cli` do not each walk the document with their own
 * interpretation of "which is the success response" or "which parameter goes in the
 * path". One read, one interpretation, and the shape validations (unique ids, no tree
 * collisions) happen once and fail early.
 */
import {
  eachOperation,
  openapi,
  type Danger,
  type HttpMethod,
  type JsonSchema,
  type OpenApiDocument,
  type Operation,
} from "../../openapi/src/index.ts";

export interface ParamIR {
  name: string;
  /** JS-safe name (`service_id` → `serviceId`). */
  jsName: string;
  required: boolean;
  description?: string;
  schema: JsonSchema;
}

export interface OpIR {
  id: string;
  /** `vps.power` → `["vps","power"]`. The last one is the method; the rest, the tree. */
  segments: string[];
  method: HttpMethod;
  path: string;
  tag: string;
  summary: string;
  description: string;
  deprecated: boolean;
  scope: string | null;
  danger: Danger;
  longRunning: boolean;
  idempotent: boolean;
  rateBucket: string | null;
  pathParams: ParamIR[];
  queryParams: ParamIR[];
  headerParams: ParamIR[];
  body: { schema: JsonSchema; required: boolean } | null;
  successStatus: number;
  successSchema: JsonSchema | null;
  cli: { command: string; positional: string[] } | null;
  mcp: { toolset: string; action: string; readonly: boolean } | null;
}

function jsName(name: string): string {
  const parts = name.split(/[_\-.]/).filter(Boolean);
  return (
    parts[0]! +
    parts
      .slice(1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("")
  );
}

function toParam(p: {
  name: string;
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
}): ParamIR {
  return {
    name: p.name,
    jsName: jsName(p.name),
    required: p.required === true,
    ...(p.description ? { description: p.description } : {}),
    schema: p.schema ?? { type: "string" },
  };
}

/**
 * The "success" response is the lowest-numbered documented 2xx. Picking the lowest
 * rather than the first key avoids depending on key order, and in practice the lowest is
 * the one the client receives on the happy path (200 before 201, 202 when it is the only
 * one).
 */
function pickSuccess(op: Operation): { status: number; schema: JsonSchema | null } {
  const codes = Object.keys(op.responses ?? {})
    .map((c) => Number(c))
    .filter((n) => Number.isFinite(n) && n >= 200 && n < 300)
    .sort((a, b) => a - b);
  const status = codes[0] ?? 200;
  const res = op.responses?.[String(status)];
  const schema = res?.content?.["application/json"]?.schema ?? null;
  return { status, schema };
}

export function buildIR(doc: OpenApiDocument = openapi): OpIR[] {
  const ops: OpIR[] = [];
  const seen = new Set<string>();

  for (const { path, method, op } of eachOperation(doc)) {
    const id = op.operationId;
    if (!id) throw new Error(`${method.toUpperCase()} ${path} has no operationId.`);
    if (seen.has(id)) throw new Error(`Duplicate operationId: ${id}`);
    seen.add(id);

    const params = op.parameters ?? [];
    const { status, schema } = pickSuccess(op);
    const bodySchema = op.requestBody?.content?.["application/json"]?.schema ?? null;
    const cli = op["x-truo-cli"];
    const mcp = op["x-truo-mcp"];

    ops.push({
      id,
      segments: id.split("."),
      method,
      path,
      tag: op.tags?.[0] ?? "General",
      summary: op.summary ?? "",
      description: op.description ?? "",
      deprecated: op.deprecated === true,
      scope: op["x-truo-scope"] ?? null,
      danger: op["x-truo-danger"] ?? "none",
      longRunning: op["x-truo-long-running"] === true,
      idempotent: op["x-truo-idempotent"] === true,
      rateBucket: op["x-truo-rate-bucket"] ?? null,
      pathParams: params.filter((p) => p.in === "path").map(toParam),
      queryParams: params.filter((p) => p.in === "query").map(toParam),
      headerParams: params.filter((p) => p.in === "header").map(toParam),
      body: bodySchema ? { schema: bodySchema, required: op.requestBody?.required === true } : null,
      successStatus: status,
      successSchema: schema,
      cli: cli ? { command: cli.command, positional: cli.positional ?? [] } : null,
      mcp: mcp ?? null,
    });
  }

  assertNoTreeCollision(ops);
  assertPathParamsDeclared(ops);
  return ops.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * An `operationId` cannot be a prefix of another.
 *
 * If `dns.zones` and `dns.zones.records` both existed, `client.dns.zones` would have to
 * be a function and an object at the same time. JS allows it, TypeScript types it badly,
 * and the CLI would not know whether `truo dns zones` is a command or a group. It is
 * cheaper to forbid it here and rename the operation in the API than to drag an
 * ambiguous tree all the way to the user.
 */
function assertNoTreeCollision(ops: OpIR[]): void {
  const leaves = new Set(ops.map((o) => o.id));
  for (const op of ops) {
    for (let i = 1; i < op.segments.length; i++) {
      const prefix = op.segments.slice(0, i).join(".");
      if (leaves.has(prefix)) {
        throw new Error(
          `Tree collision: "${prefix}" is an operation and at the same time the prefix of "${op.id}".\n` +
            `Rename one of the two in the API (operationIds are public contract: do it before publishing).`,
        );
      }
    }
  }
}

/** Every `{placeholder}` in the path must exist as an `in: path` parameter, and vice versa. */
function assertPathParamsDeclared(ops: OpIR[]): void {
  for (const op of ops) {
    const inPath = [...op.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!);
    const declared = op.pathParams.map((p) => p.name);
    const missing = inPath.filter((n) => !declared.includes(n));
    const extra = declared.filter((n) => !inPath.includes(n));
    if (missing.length || extra.length) {
      throw new Error(
        `${op.id} (${op.method.toUpperCase()} ${op.path}): path parameters out of sync.` +
          (missing.length ? ` Undeclared: ${missing.join(", ")}.` : "") +
          (extra.length ? ` Declared but unused: ${extra.join(", ")}.` : ""),
      );
    }
  }
}
