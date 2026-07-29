/**
 * Representacion intermedia: el spec OpenAPI aplanado a lo que los generadores necesitan.
 *
 * Existe para que `gen-sdk` y `gen-cli` no vuelvan a recorrer el documento cada uno con su
 * propia interpretacion de "cual es la respuesta exitosa" o "que parametro va en el path".
 * Una sola lectura, una sola interpretacion, y las validaciones de forma (ids unicos, sin
 * colisiones de arbol) ocurren una vez y fallan temprano.
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
  /** Nombre seguro en JS (`service_id` → `serviceId`). */
  jsName: string;
  required: boolean;
  description?: string;
  schema: JsonSchema;
}

export interface OpIR {
  id: string;
  /** `vps.power` → `["vps","power"]`. El ultimo es el metodo; los previos, el arbol. */
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
 * La respuesta "exitosa" es la 2xx documentada de menor codigo. Elegir el menor y no la
 * primera del objeto evita depender del orden de las claves, y en la practica el menor es
 * el que el cliente recibe en el camino feliz (200 antes que 201, 202 cuando es lo unico).
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
    if (!id) throw new Error(`${method.toUpperCase()} ${path} no tiene operationId.`);
    if (seen.has(id)) throw new Error(`operationId duplicado: ${id}`);
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
 * Un `operationId` no puede ser prefijo de otro.
 *
 * Si existieran `dns.zones` y `dns.zones.records`, `client.dns.zones` tendria que ser a la
 * vez funcion y objeto. JS lo permite, TypeScript lo tipa mal y el CLI no sabria si
 * `truo dns zones` es un comando o un grupo. Es mas barato prohibirlo aca y renombrar la
 * operacion en la API que arrastrar un arbol ambiguo hasta el usuario.
 */
function assertNoTreeCollision(ops: OpIR[]): void {
  const leaves = new Set(ops.map((o) => o.id));
  for (const op of ops) {
    for (let i = 1; i < op.segments.length; i++) {
      const prefix = op.segments.slice(0, i).join(".");
      if (leaves.has(prefix)) {
        throw new Error(
          `Colision de arbol: "${prefix}" es una operacion y a la vez el prefijo de "${op.id}".\n` +
            `Renombra una de las dos en la API (los operationId son contrato publico: hacelo antes de publicar).`,
        );
      }
    }
  }
}

/** Cada `{placeholder}` del path tiene que existir como parametro `in: path`, y al reves. */
function assertPathParamsDeclared(ops: OpIR[]): void {
  for (const op of ops) {
    const inPath = [...op.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!);
    const declared = op.pathParams.map((p) => p.name);
    const missing = inPath.filter((n) => !declared.includes(n));
    const extra = declared.filter((n) => !inPath.includes(n));
    if (missing.length || extra.length) {
      throw new Error(
        `${op.id} (${op.method.toUpperCase()} ${op.path}): parametros de path descuadrados.` +
          (missing.length ? ` Sin declarar: ${missing.join(", ")}.` : "") +
          (extra.length ? ` Declarados de mas: ${extra.join(", ")}.` : ""),
      );
    }
  }
}
