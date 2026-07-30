/**
 * Generates the SDK's three files: the types, the operations manifest and the typed
 * resource tree.
 *
 * The tree is emitted as an object literal inside `createResources()` and **not** as a
 * pile of declared interfaces: TypeScript infers the exact signature of every method from
 * the literal, so the typing the user sees is identical with a fraction of the generated
 * code — and there is no way for declaration and implementation to drift apart, because
 * there is only one.
 */
import { resolve } from "node:path";
import type { JsonSchema, OpenApiDocument } from "../../openapi/src/index.ts";
import type { OpIR, ParamIR } from "./ir.ts";
import { declareSchema, tsType, type EmitCtx } from "./ts-types.ts";
import { BANNER, jsdoc, pascal, camel, quoteKey, writeGenerated, type WriteResult } from "./util.ts";

const SDK = (f: string) => resolve(import.meta.dirname, "../../sdk/src/generated", f);

/** Keys of `RequestOptions`. A query param with the same name would make the signature ambiguous. */
const RESERVED = new Set(["signal", "idempotencyKey", "headers", "timeoutMs", "maxRetries"]);

function paramsToObject(params: ParamIR[], ctx: EmitCtx, indent: string): string {
  const inner = indent + "  ";
  const lines = params.map((p) => {
    const doc = jsdoc(p.description, inner);
    return `${doc}${inner}${quoteKey(p.jsName)}${p.required ? "" : "?"}: ${tsType(p.schema, ctx, inner)};`;
  });
  return `{\n${lines.join("\n")}\n${indent}}`;
}

/** Resolves `$ref` a single level; enough to ask about a response's shape. */
function deref(schema: JsonSchema | null, doc: OpenApiDocument): JsonSchema | null {
  if (!schema) return null;
  if (!schema.$ref) return schema;
  const name = schema.$ref.split("/").pop()!;
  return doc.components?.schemas?.[name] ?? null;
}

/** A paginated collection is one that carries `data` + `has_more`; the contract defines it that way. */
function isPaginated(op: OpIR, doc: OpenApiDocument): boolean {
  const s = deref(op.successSchema, doc);
  return Boolean(s?.properties?.["data"] && s.properties?.["has_more"]);
}

/** The type of ONE item of a paginated collection, to type the iterator. */
function itemSchema(op: OpIR, doc: OpenApiDocument): JsonSchema | null {
  return deref(op.successSchema, doc)?.properties?.["data"]?.items ?? null;
}

/** `{ id: id }` is noise; `{ id }` is not. Only spelled out when the names differ. */
function pathObject(op: OpIR): string {
  if (!op.pathParams.length) return "undefined";
  const parts = op.pathParams.map((p) =>
    p.name === p.jsName ? quoteKey(p.name) : `${quoteKey(p.name)}: ${p.jsName}`,
  );
  return `{ ${parts.join(", ")} }`;
}

export function genSdk(ops: OpIR[], doc: OpenApiDocument, check: boolean): WriteResult[] {
  const schemas = doc.components?.schemas ?? {};
  const ctx: EmitCtx = { known: new Set(Object.keys(schemas)), used: new Set() };

  // ── types.ts ───────────────────────────────────────────────────────────────
  const typeChunks: string[] = [];
  for (const [name, schema] of Object.entries(schemas)) {
    typeChunks.push(declareSchema(name, schema, ctx));
  }

  /** Type name for an operation's response / body / query. */
  const responseType = new Map<string, string>();
  const bodyType = new Map<string, string>();
  const queryType = new Map<string, string>();

  for (const op of ops) {
    const P = pascal(op.id);

    if (op.successSchema?.$ref) {
      responseType.set(op.id, tsType(op.successSchema, ctx));
    } else if (op.successSchema) {
      const name = `${P}Response`;
      typeChunks.push(
        jsdoc(`${op.successStatus} response of \`${op.method.toUpperCase()} ${op.path}\`.`) +
          `export type ${name} = ${tsType(op.successSchema, ctx, "")};\n`,
      );
      responseType.set(op.id, name);
    } else {
      responseType.set(op.id, "void");
    }

    if (op.body) {
      if (op.body.schema.$ref) {
        bodyType.set(op.id, tsType(op.body.schema, ctx));
      } else {
        const name = `${P}Body`;
        typeChunks.push(
          jsdoc(`Body of \`${op.method.toUpperCase()} ${op.path}\`.`) +
            `export type ${name} = ${tsType(op.body.schema, ctx, "")};\n`,
        );
        bodyType.set(op.id, name);
      }
    }

    if (op.queryParams.length) {
      const collision = op.queryParams.find((p) => RESERVED.has(p.jsName));
      if (collision) {
        throw new Error(
          `${op.id}: the query param "${collision.name}" collides with an SDK request option ` +
            `(${[...RESERVED].join(", ")}). Rename it in the API before publishing.`,
        );
      }
      const name = `${P}Query`;
      typeChunks.push(
        jsdoc(`Query parameters of \`${op.method.toUpperCase()} ${op.path}\`.`) +
          `export type ${name} = ${paramsToObject(op.queryParams, ctx, "")};\n`,
      );
      queryType.set(op.id, name);
    }
  }

  const typesFile =
    BANNER +
    `\n/** Contract types for \`api.truo.cloud/v1\` (OpenAPI ${doc.info.version}). */\n\n` +
    typeChunks.join("\n");

  // ── operations.ts ──────────────────────────────────────────────────────────
  const entries = ops.map((op) => {
    const meta = {
      id: op.id,
      method: op.method.toUpperCase(),
      path: op.path,
      tag: op.tag,
      summary: op.summary,
      scope: op.scope,
      danger: op.danger,
      longRunning: op.longRunning,
      idempotent: op.idempotent,
      rateBucket: op.rateBucket,
      deprecated: op.deprecated,
      paginated: isPaginated(op, doc),
      pathParams: op.pathParams.map((p) => p.name),
      queryParams: op.queryParams.map((p) => p.name),
      hasBody: Boolean(op.body),
      successStatus: op.successStatus,
    };
    return `  ${quoteKey(op.id)}: ${JSON.stringify(meta)},`;
  });

  // The two constants are inlined here rather than imported from `@truocloud/openapi` on
  // purpose: that way `@truocloud/sdk` is published **without a single dependency**, not
  // even on a sibling package. The full spec weighs half a megabyte and has no reason to
  // travel inside the application of a client who only wants to call three endpoints.
  const operationsFile =
    BANNER +
    `
/** Contract version (the OpenAPI \`info.version\`). */
export const API_VERSION = ${JSON.stringify(doc.info.version)};

/** Production base URL (the OpenAPI \`servers[0].url\`). */
export const API_BASE_URL = ${JSON.stringify(doc.servers?.[0]?.url ?? "https://api.truo.cloud")};

/** Metadata for one operation, as declared by the OpenAPI spec. */
export interface OperationMeta {
  /** \`operationId\`. Stable forever: it is the join key between SDK, CLI, MCP and docs. */
  id: string;
  method: string;
  /** Template with placeholders, e.g. \`/v1/vps/{id}/power\`. */
  path: string;
  tag: string;
  summary: string;
  /** Required scope (\`vps:write\`), or \`null\` if none is required. */
  scope: string | null;
  /** How much a mistake hurts. Used by the CLI's confirmation gate and the MCP's. */
  danger: "none" | "reversible" | "destructive";
  /** Returns 202 + an asynchronous operation that must be awaited. */
  longRunning: boolean;
  /** Accepts \`Idempotency-Key\` — and therefore the SDK can retry it safely. */
  idempotent: boolean;
  rateBucket: string | null;
  deprecated: boolean;
  /** The response is a cursor collection (\`data\` + \`has_more\`). */
  paginated: boolean;
  pathParams: string[];
  queryParams: string[];
  hasBody: boolean;
  successStatus: number;
}

/** The ${ops.length} operations of \`/v1\`, indexed by \`operationId\`. */
export const OPERATIONS = {
${entries.join("\n")}
} as const satisfies Record<string, OperationMeta>;

export type OperationId = keyof typeof OPERATIONS;

export const OPERATION_LIST: OperationMeta[] = Object.values(OPERATIONS);

export function getOperation(id: string): OperationMeta | undefined {
  return (OPERATIONS as Record<string, OperationMeta>)[id];
}
`;

  // ── resources.ts ───────────────────────────────────────────────────────────
  interface Node {
    children: Map<string, Node>;
    op?: OpIR;
  }
  const root: Node = { children: new Map() };
  for (const op of ops) {
    let node = root;
    for (const seg of op.segments.slice(0, -1)) {
      let next = node.children.get(seg);
      if (!next) {
        next = { children: new Map() };
        node.children.set(seg, next);
      }
      node = next;
    }
    const leaf = op.segments.at(-1)!;
    node.children.set(leaf, { children: new Map(), op });
  }

  function methodSource(op: OpIR, indent: string): string {
    const args: string[] = [];
    for (const p of op.pathParams) {
      args.push(`${p.jsName}: ${tsType(p.schema, ctx)}`);
    }
    if (op.body) {
      const t = bodyType.get(op.id)!;
      args.push(op.body.required ? `body: T.${t}` : `body?: T.${t}`);
    }
    const q = queryType.get(op.id);
    args.push(q ? `params?: T.${q} & RequestOptions` : `params?: RequestOptions`);

    const pathObj = pathObject(op);
    const queryKeys = op.queryParams.length
      ? `[${op.queryParams.map((p) => JSON.stringify(p.jsName)).join(", ")}]`
      : "undefined";
    const ret = responseType.get(op.id)!;
    const retType = ret === "void" ? "void" : `T.${ret}`;

    const jsdocText = jsdoc(
      [
        op.summary,
        op.description,
        op.scope ? `\nScope: \`${op.scope}\`` : "",
        op.danger === "destructive" ? "**Destructive: there is no undo.**" : "",
        op.longRunning ? "Returns an asynchronous operation; await it with `operations.wait()`." : "",
        op.deprecated ? "@deprecated" : "",
      ]
        .filter(Boolean)
        .join("\n"),
      indent,
    );

    return (
      `${jsdocText}${indent}${quoteKey(camel(op.segments.at(-1)!))}: (${args.join(", ")}) =>\n` +
      `${indent}  call<${retType}>(${JSON.stringify(op.id)}, { path: ${pathObj}, body: ${
        op.body ? "body" : "undefined"
      }, queryKeys: ${queryKeys}, params }),`
    );
  }

  function paginateSource(op: OpIR, indent: string): string {
    const args: string[] = op.pathParams.map((p) => `${p.jsName}: ${tsType(p.schema, ctx)}`);
    const q = queryType.get(op.id);
    args.push(q ? `params?: T.${q} & RequestOptions` : `params?: RequestOptions`);
    const pathObj = pathObject(op);
    const queryKeys = op.queryParams.length
      ? `[${op.queryParams.map((p) => JSON.stringify(p.jsName)).join(", ")}]`
      : "undefined";
    const item = itemSchema(op, doc);
    // A `$ref` resolves to a name from `types.ts` and must be qualified; anything else
    // is an inline type expression that stands on its own.
    const itemType = item ? (item.$ref ? `T.${tsType(item, ctx, indent)}` : tsType(item, ctx, indent)) : "unknown";
    const jsdocText = jsdoc(
      `Iterates **all** pages of \`${op.id}\`, following the cursor on its own.\n` +
        `A \`for await\` over this never drops results by forgetting \`next_cursor\`.`,
      indent,
    );
    return (
      `${jsdocText}${indent}listAll: (${args.join(", ")}) =>\n` +
      `${indent}  paginate<${itemType}>(\n` +
      `${indent}    ${JSON.stringify(op.id)}, { path: ${pathObj}, queryKeys: ${queryKeys}, params },\n` +
      `${indent}  ),`
    );
  }

  function nodeSource(node: Node, indent: string): string {
    const parts: string[] = [];
    for (const [key, child] of node.children) {
      if (child.op) {
        parts.push(methodSource(child.op, indent));
        if (child.op.segments.at(-1) === "list" && isPaginated(child.op, doc)) {
          parts.push(paginateSource(child.op, indent));
        }
      } else {
        parts.push(`${indent}${quoteKey(camel(key))}: {\n${nodeSource(child, indent + "  ")}\n${indent}},`);
      }
    }
    return parts.join("\n");
  }

  const resourcesFile =
    BANNER +
    `
import type * as T from "./types.ts";
import type { Call, Paginate, RequestOptions } from "../types.ts";

/**
 * Builds the client's resource tree on top of a transport.
 *
 * Every method is one line: it resolves the \`operationId\`, assembles path/query/body
 * and delegates. All the real logic — retries, idempotency, errors, cursor — lives in
 * the transport, not here, so regenerating this file can never break it.
 */
export function createResources(call: Call, paginate: Paginate) {
  return {
${nodeSource(root, "    ")}
  };
}

/** The resource tree, inferred. It is what \`TruoClient\` exposes. */
export type Resources = ReturnType<typeof createResources>;
`;

  const orphans = [...ctx.known].filter((n) => !ctx.used.has(n));
  if (orphans.length) {
    console.warn(
      `  warning: ${orphans.length} schema(s) declared but never referenced: ${orphans.slice(0, 6).join(", ")}${
        orphans.length > 6 ? "…" : ""
      }`,
    );
  }

  return [
    writeGenerated(SDK("types.ts"), typesFile, check),
    writeGenerated(SDK("operations.ts"), operationsFile, check),
    writeGenerated(SDK("resources.ts"), resourcesFile, check),
  ];
}
