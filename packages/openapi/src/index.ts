/**
 * El documento OpenAPI de `api.truo.cloud/v1`, tal cual lo sirve la API.
 *
 * Este paquete no genera nada ni valida nada: es el **artefacto de contrato**, y existe
 * como paquete propio para que el SDK, el CLI y el servidor MCP consuman exactamente el
 * mismo bytes-por-bytes que `GET /v1/openapi.json`. Cualquier divergencia entre lo que
 * publica la API y lo que asume una herramienta es un bug, y tenerlo en un solo lugar es
 * lo que permite detectarlo con un diff (`bun run sync:spec --check`).
 *
 * La copia se sincroniza contra `GET /v1/openapi.json`, que la API genera de los schemas
 * de validacion de sus propios handlers. La cadena entera es: handler → schema → spec →
 * SDK/CLI/MCP. No hay ningun eslabon escrito a mano.
 */
import spec from "../openapi/v1.json" with { type: "json" };

/** Version del contrato publicada en `info.version`. */
export const API_VERSION: string = (spec as { info: { version: string } }).info.version;

/** Base URL de produccion declarada en el spec (`servers[0].url`). */
export const API_BASE_URL: string =
  (spec as { servers?: { url: string }[] }).servers?.[0]?.url ?? "https://api.truo.cloud";

/** El documento OpenAPI completo. */
export const openapi = spec as unknown as OpenApiDocument;
export default openapi;

// ─────────────────────────────────────────────────────────────────────────────
// Tipos minimos de OpenAPI 3.1
//
// A proposito NO se usa un paquete de tipos de OpenAPI: solo se necesita describir el
// subconjunto que el codegen recorre, y una dependencia mas en un paquete que se publica
// a npm cuesta mas que las cuarenta lineas de abajo.
// ─────────────────────────────────────────────────────────────────────────────

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/** Clasificacion de riesgo de una operacion. La comparten el gate del MCP y el prompt de confirmacion del CLI. */
export type Danger = "none" | "reversible" | "destructive";

export interface JsonSchema {
  $ref?: string;
  type?: string | string[];
  format?: string;
  enum?: (string | number | boolean | null)[];
  const?: unknown;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  nullable?: boolean;
  description?: string;
  example?: unknown;
  default?: unknown;
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  description?: string;
  deprecated?: boolean;
  schema?: JsonSchema;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: Parameter[];
  requestBody?: {
    required?: boolean;
    description?: string;
    content?: Record<string, { schema?: JsonSchema }>;
  };
  responses?: Record<
    string,
    { description?: string; content?: Record<string, { schema?: JsonSchema }> }
  >;
  security?: Record<string, string[]>[];
  /** Scope requerido, gramatica `<recurso>:<accion>`. */
  "x-truo-scope"?: string;
  "x-truo-rate-bucket"?: "read" | "write" | "expensive";
  "x-truo-danger"?: Danger;
  /** `true` si devuelve 202 + una operacion asincrona. */
  "x-truo-long-running"?: boolean;
  /** `true` si acepta `Idempotency-Key`. */
  "x-truo-idempotent"?: boolean;
  "x-truo-cli"?: { command: string; positional?: string[] };
  "x-truo-mcp"?: { toolset: string; action: string; readonly: boolean };
}

export type PathItem = Partial<Record<HttpMethod, Operation>>;

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string; description?: string }[];
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, JsonSchema>;
    securitySchemes?: Record<string, unknown>;
  };
}

export const HTTP_METHODS: readonly HttpMethod[] = ["get", "post", "put", "patch", "delete"];

/** Recorre el documento y entrega cada operacion con su metodo y path. Orden estable. */
export function* eachOperation(
  doc: OpenApiDocument = openapi,
): Generator<{ path: string; method: HttpMethod; op: Operation }> {
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (op) yield { path, method, op };
    }
  }
}
