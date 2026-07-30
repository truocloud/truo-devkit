/**
 * The OpenAPI document for `api.truo.cloud/v1`, exactly as the API serves it.
 *
 * This package generates nothing and validates nothing: it is the **contract artifact**,
 * and it exists as its own package so the SDK, the CLI and the MCP server consume exactly
 * the same bytes as `GET /v1/openapi.json`. Any divergence between what the API publishes
 * and what a tool assumes is a bug, and keeping it in one place is what makes it
 * detectable with a diff (`bun run sync:spec --check`).
 *
 * The copy is synced against `GET /v1/openapi.json`, which the API generates from the
 * validation schemas of its own handlers. The full chain is: handler → schema → spec →
 * SDK/CLI/MCP. No link is written by hand.
 */
import spec from "../openapi/v1.json" with { type: "json" };

/** Contract version published in `info.version`. */
export const API_VERSION: string = (spec as { info: { version: string } }).info.version;

/** Production base URL declared in the spec (`servers[0].url`). */
export const API_BASE_URL: string =
  (spec as { servers?: { url: string }[] }).servers?.[0]?.url ?? "https://api.truo.cloud";

/** The full OpenAPI document. */
export const openapi = spec as unknown as OpenApiDocument;
export default openapi;

// ─────────────────────────────────────────────────────────────────────────────
// Minimal OpenAPI 3.1 types
//
// Deliberately NOT an OpenAPI types package: only the subset the codegen walks needs
// describing, and one more dependency in a package published to npm costs more than the
// forty lines below.
// ─────────────────────────────────────────────────────────────────────────────

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/** Risk classification of an operation. Shared by the MCP gate and the CLI's confirmation prompt. */
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
  /** Required scope, `<resource>:<action>` grammar. */
  "x-truo-scope"?: string;
  "x-truo-rate-bucket"?: "read" | "write" | "expensive";
  "x-truo-danger"?: Danger;
  /** `true` if it returns 202 + an asynchronous operation. */
  "x-truo-long-running"?: boolean;
  /** `true` if it accepts `Idempotency-Key`. */
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

/** Walks the document and yields every operation with its method and path. Stable order. */
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
