/**
 * Genera los tres archivos del SDK: los tipos, el manifiesto de operaciones y el arbol
 * de recursos tipado.
 *
 * El arbol se emite como un object literal dentro de `createResources()` y **no** como un
 * puñado de interfaces declaradas: TypeScript infiere la firma exacta de cada metodo del
 * literal, asi que el tipado que ve el usuario es identico con una fraccion del codigo
 * generado — y no hay forma de que la declaracion y la implementacion se desincronicen,
 * porque hay una sola.
 */
import { resolve } from "node:path";
import type { JsonSchema, OpenApiDocument } from "../../openapi/src/index.ts";
import type { OpIR, ParamIR } from "./ir.ts";
import { declareSchema, tsType, type EmitCtx } from "./ts-types.ts";
import { BANNER, jsdoc, pascal, camel, quoteKey, writeGenerated, type WriteResult } from "./util.ts";

const SDK = (f: string) => resolve(import.meta.dirname, "../../sdk/src/generated", f);

/** Claves de `RequestOptions`. Un query param que se llame igual haria ambigua la firma. */
const RESERVED = new Set(["signal", "idempotencyKey", "headers", "timeoutMs", "maxRetries"]);

function paramsToObject(params: ParamIR[], ctx: EmitCtx, indent: string): string {
  const inner = indent + "  ";
  const lines = params.map((p) => {
    const doc = jsdoc(p.description, inner);
    return `${doc}${inner}${quoteKey(p.jsName)}${p.required ? "" : "?"}: ${tsType(p.schema, ctx, inner)};`;
  });
  return `{\n${lines.join("\n")}\n${indent}}`;
}

/** Resuelve `$ref` una sola vez; alcanza para preguntar por la forma de una respuesta. */
function deref(schema: JsonSchema | null, doc: OpenApiDocument): JsonSchema | null {
  if (!schema) return null;
  if (!schema.$ref) return schema;
  const name = schema.$ref.split("/").pop()!;
  return doc.components?.schemas?.[name] ?? null;
}

/** Una coleccion paginada es la que trae `data` + `has_more`; asi lo define el contrato. */
function isPaginated(op: OpIR, doc: OpenApiDocument): boolean {
  const s = deref(op.successSchema, doc);
  return Boolean(s?.properties?.["data"] && s.properties?.["has_more"]);
}

/** El tipo de UN elemento de una coleccion paginada, para tipar el iterador. */
function itemSchema(op: OpIR, doc: OpenApiDocument): JsonSchema | null {
  return deref(op.successSchema, doc)?.properties?.["data"]?.items ?? null;
}

/** `{ id: id }` es ruido; `{ id }` no. Solo se explicita cuando los nombres difieren. */
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

  /** Nombre del tipo de la respuesta / body / query de una operacion. */
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
        jsdoc(`Respuesta ${op.successStatus} de \`${op.method.toUpperCase()} ${op.path}\`.`) +
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
          jsdoc(`Cuerpo de \`${op.method.toUpperCase()} ${op.path}\`.`) +
            `export type ${name} = ${tsType(op.body.schema, ctx, "")};\n`,
        );
        bodyType.set(op.id, name);
      }
    }

    if (op.queryParams.length) {
      const collision = op.queryParams.find((p) => RESERVED.has(p.jsName));
      if (collision) {
        throw new Error(
          `${op.id}: el query param "${collision.name}" choca con una opcion de request del SDK ` +
            `(${[...RESERVED].join(", ")}). Renombralo en la API antes de publicar.`,
        );
      }
      const name = `${P}Query`;
      typeChunks.push(
        jsdoc(`Parametros de consulta de \`${op.method.toUpperCase()} ${op.path}\`.`) +
          `export type ${name} = ${paramsToObject(op.queryParams, ctx, "")};\n`,
      );
      queryType.set(op.id, name);
    }
  }

  const typesFile =
    BANNER +
    `\n/** Tipos del contrato de \`api.truo.cloud/v1\` (OpenAPI ${doc.info.version}). */\n\n` +
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

  // Las dos constantes se inyectan aca y no se importan de `@truocloud/openapi` a
  // proposito: asi `@truocloud/sdk` se publica **sin una sola dependencia**, ni siquiera
  // de un paquete hermano. El spec completo pesa medio mega y no tiene por que viajar
  // dentro de la aplicacion de un cliente que solo quiere llamar tres endpoints.
  const operationsFile =
    BANNER +
    `
/** Version del contrato (\`info.version\` del OpenAPI). */
export const API_VERSION = ${JSON.stringify(doc.info.version)};

/** Base URL de produccion (\`servers[0].url\` del OpenAPI). */
export const API_BASE_URL = ${JSON.stringify(doc.servers?.[0]?.url ?? "https://api.truo.cloud")};

/** Metadatos de una operacion, tal como los declara el OpenAPI. */
export interface OperationMeta {
  /** \`operationId\`. Estable para siempre: es la clave de join entre SDK, CLI, MCP y docs. */
  id: string;
  method: string;
  /** Template con placeholders, p. ej. \`/v1/vps/{id}/power\`. */
  path: string;
  tag: string;
  summary: string;
  /** Scope requerido (\`vps:write\`), o \`null\` si no exige ninguno. */
  scope: string | null;
  /** Cuanto duele equivocarse. Lo usan el gate de confirmacion del CLI y el del MCP. */
  danger: "none" | "reversible" | "destructive";
  /** Devuelve 202 + una operacion asincrona que hay que esperar. */
  longRunning: boolean;
  /** Acepta \`Idempotency-Key\` — y por lo tanto el SDK puede reintentarla con seguridad. */
  idempotent: boolean;
  rateBucket: string | null;
  deprecated: boolean;
  /** La respuesta es una coleccion con cursor (\`data\` + \`has_more\`). */
  paginated: boolean;
  pathParams: string[];
  queryParams: string[];
  hasBody: boolean;
  successStatus: number;
}

/** Las ${ops.length} operaciones de \`/v1\`, indexadas por \`operationId\`. */
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
        op.danger === "destructive" ? "**Destructiva: no tiene vuelta atras.**" : "",
        op.longRunning ? "Devuelve una operacion asincrona; espera con `operations.wait()`." : "",
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
    // Un `$ref` resuelve a un nombre de `types.ts` y hay que calificarlo; cualquier otra
    // cosa es una expresion de tipo inline que ya se basta sola.
    const itemType = item ? (item.$ref ? `T.${tsType(item, ctx, indent)}` : tsType(item, ctx, indent)) : "unknown";
    const jsdocText = jsdoc(
      `Itera **todas** las paginas de \`${op.id}\`, siguiendo el cursor sola.\n` +
        `Un \`for await\` sobre esto nunca deja resultados afuera por olvidar \`next_cursor\`.`,
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
 * Construye el arbol de recursos del cliente sobre un transporte.
 *
 * Cada metodo es una linea: resuelve el \`operationId\`, arma path/query/body y delega.
 * Toda la logica de verdad —reintentos, idempotencia, errores, cursor— vive en el
 * transporte, no aca, asi que regenerar este archivo nunca puede romperla.
 */
export function createResources(call: Call, paginate: Paginate) {
  return {
${nodeSource(root, "    ")}
  };
}

/** El arbol de recursos, inferido. Es lo que expone \`TruoClient\`. */
export type Resources = ReturnType<typeof createResources>;
`;

  const orphans = [...ctx.known].filter((n) => !ctx.used.has(n));
  if (orphans.length) {
    console.warn(
      `  aviso: ${orphans.length} schema(s) declarados y no referenciados: ${orphans.slice(0, 6).join(", ")}${
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
