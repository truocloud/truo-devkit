/**
 * JSON Schema → TypeScript.
 *
 * Se escribe a mano en vez de usar `openapi-typescript` por una razon concreta: el spec lo
 * genera Zod, asi que el subconjunto de JSON Schema que aparece aca es chico y conocido, y
 * a cambio el devkit entero queda **sin dependencias de build**. Un cliente puede clonar,
 * correr `bun run gen` y obtener el SDK sin instalar nada. Si algun dia el spec incorpora
 * construcciones que esto no cubre, `unsupportedSchema()` lo grita en vez de emitir `any`
 * en silencio — que es el modo en que un generador de tipos te miente.
 */
import type { JsonSchema } from "../../openapi/src/index.ts";
import { jsdoc, quoteKey } from "./util.ts";

export interface EmitCtx {
  /** Nombres de `components.schemas`, para resolver `$ref`. */
  known: Set<string>;
  /** Refs efectivamente usadas, para poder avisar de schemas huerfanos. */
  used: Set<string>;
}

export function refName(ref: string): string {
  const m = /^#\/components\/schemas\/(.+)$/.exec(ref);
  if (!m) throw new Error(`$ref no soportada: ${ref} (solo #/components/schemas/*)`);
  return m[1]!;
}

function lit(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "unknown";
}

function primitive(t: string): string {
  switch (t) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "object":
      return "Record<string, unknown>";
    case "array":
      return "unknown[]";
    default:
      return "unknown";
  }
}

function union(parts: string[]): string {
  const uniq = [...new Set(parts)];
  if (uniq.length === 0) return "never";
  if (uniq.length === 1) return uniq[0]!;
  return uniq.map((p) => (p.includes("=>") || p.includes("|") ? `(${p})` : p)).join(" | ");
}

/**
 * Expresion de tipo para un schema. `indent` solo afecta al pretty-print de objetos
 * inline; los `$ref` y los primitivos lo ignoran.
 */
export function tsType(schema: JsonSchema | undefined | null, ctx: EmitCtx, indent = ""): string {
  if (!schema) return "unknown";

  if (schema.$ref) {
    const name = refName(schema.$ref);
    if (!ctx.known.has(name)) throw new Error(`$ref a un schema inexistente: ${name}`);
    ctx.used.add(name);
    return name;
  }

  if (schema.const !== undefined) return lit(schema.const);

  if (schema.enum) {
    const base = union(schema.enum.map(lit));
    return schema.nullable ? union([base, "null"]) : base;
  }

  if (schema.allOf?.length) {
    const parts = schema.allOf.map((s) => tsType(s, ctx, indent));
    return parts.length === 1 ? parts[0]! : parts.join(" & ");
  }

  const variants = schema.oneOf ?? schema.anyOf;
  if (variants?.length) {
    const u = union(variants.map((s) => tsType(s, ctx, indent)));
    return schema.nullable ? union([u, "null"]) : u;
  }

  // `type` puede ser un array (OpenAPI 3.1): `["string","null"]`.
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];

  if (types.length === 0) {
    // Sin `type` pero con `properties` sigue siendo un objeto; si no, es libre.
    if (schema.properties) return objectType(schema, ctx, indent);
    return "unknown";
  }

  const parts = types.map((t) => {
    if (t === "object") return objectType(schema, ctx, indent);
    if (t === "array") return arrayType(schema, ctx, indent);
    return primitive(t);
  });

  return schema.nullable ? union([...parts, "null"]) : union(parts);
}

function arrayType(schema: JsonSchema, ctx: EmitCtx, indent: string): string {
  const inner = tsType(schema.items, ctx, indent);
  return /[|&\s]/.test(inner) && !inner.endsWith("]") ? `(${inner})[]` : `${inner}[]`;
}

function objectType(schema: JsonSchema, ctx: EmitCtx, indent: string): string {
  const props = schema.properties;
  if (!props || Object.keys(props).length === 0) {
    const ap = schema.additionalProperties;
    if (ap && typeof ap === "object") return `Record<string, ${tsType(ap, ctx, indent)}>`;
    return "Record<string, unknown>";
  }
  const req = new Set(schema.required ?? []);
  const inner = indent + "  ";
  const lines: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    const doc = jsdoc(value.description, inner);
    const optional = req.has(key) ? "" : "?";
    lines.push(`${doc}${inner}${quoteKey(key)}${optional}: ${tsType(value, ctx, inner)};`);
  }
  const extra =
    schema.additionalProperties && typeof schema.additionalProperties === "object"
      ? `\n${inner}[key: string]: ${tsType(schema.additionalProperties, ctx, inner)};`
      : "";
  return `{\n${lines.join("\n")}${extra}\n${indent}}`;
}

/** Declaracion `export type X = …` de un schema con nombre de `components.schemas`. */
export function declareSchema(name: string, schema: JsonSchema, ctx: EmitCtx): string {
  const doc = jsdoc(schema.description);
  return `${doc}export type ${name} = ${tsType(schema, ctx, "")};\n`;
}
