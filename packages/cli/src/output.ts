/**
 * Renderizado de la salida.
 *
 * Regla que atraviesa todo el archivo: **la tabla va a stdout y todo lo demas a stderr**.
 * Progreso, avisos y confirmaciones nunca contaminan el stdout, asi
 * `truo vps list -o json > f.json` produce un JSON valido incluso cuando el comando tuvo
 * algo que decir por el camino.
 */

export type OutputFormat = "table" | "json" | "jsonl" | "id" | "yaml";

const NO_COLOR = Boolean(process.env["NO_COLOR"]) || process.env["TERM"] === "dumb";
const isTty = Boolean(process.stdout.isTTY);
const useColor = isTty && !NO_COLOR;

const c = {
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  red: (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  cyan: (s: string) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
};
export const color = c;

export function out(text: string): void {
  process.stdout.write(text.endsWith("\n") ? text : text + "\n");
}

export function info(text: string): void {
  process.stderr.write(text + "\n");
}

export function warn(text: string): void {
  process.stderr.write(c.yellow(text) + "\n");
}

export function fail(text: string): void {
  process.stderr.write(c.red(text) + "\n");
}

/**
 * Selector de campo por ruta con puntos: `data.0.hostname`, `resource.id`.
 *
 * No es JMESPath. Cubre el caso que aparece en el 90 % de los scripts —sacar un valor de
 * la respuesta— sin arrastrar una dependencia al binario. Para consultas de verdad esta
 * `-o json | jq`, que es lo que la documentacion recomienda y no pretende reemplazar.
 */
export function selectPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      if (segment === "*") return current;
      const index = Number(segment);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Columnas preferidas por tipo de objeto.
 *
 * Sin esto la tabla mostraria las primeras claves del JSON, que es un orden accidental. Un
 * VPS se identifica por id, hostname y estado; que aparezca `object` y `vmid` primero
 * obliga a leer la fila entera para encontrar lo que se buscaba.
 */
const COLUMNS: Record<string, string[]> = {
  vps: ["id", "hostname", "state", "status", "primary_ip", "node"],
  service: ["id", "family", "name", "status", "primary_ip", "next_due_date"],
  operation: ["id", "type", "status", "progress", "created_at"],
  api_key: ["id", "name", "token_prefix", "scopes", "last_used_at", "revoked_at"],
  audit_log: ["created_at", "method", "route", "status", "ip", "request_id"],
  dns_zone: ["id", "service", "status", "record_count", "serial"],
  dns_record: ["name", "type", "ttl", "values"],
  dbaas: ["id", "engine", "engine_version", "state", "host", "port", "region"],
  dbaas_database: ["name", "owner", "size_bytes", "table_count"],
  dbaas_user: ["username", "host", "can_login", "can_create_db"],
  dbaas_backup: ["id", "type", "size_bytes", "created_at"],
  vps_backup: ["id", "size_bytes", "format", "storage", "created_at"],
  vps_ip: ["address", "version", "netmask", "gateway"],
  vps_template: ["id", "name", "type", "storage"],
  caas: ["id", "label", "status", "primary_ip", "provisioning_state"],
  caas_app: ["id", "name", "status", "source"],
  caas_deployment: ["id", "status", "created_at"],
  caas_domain: ["host", "https", "certificate_type"],
  load_balancer: ["id", "hostname", "status", "public_ip", "healthy", "listener_count"],
  lb_listener: ["id", "name", "protocol", "port", "domain", "algorithm"],
  lb_backend: ["id", "listener", "ip", "port", "weight"],
  storage_bucket: ["name", "access", "objects", "size_bytes", "created_at"],
  storage_object: ["key", "size_bytes", "content_type", "last_modified"],
  storage_access_key: ["id", "name", "access_key_id", "permission", "last_used"],
  mail_gateway_domain: ["id", "domain", "status", "verified_at"],
  mail_gateway_message: ["occurred_at", "recipient", "subject", "status", "category"],
  mail_gateway_key: ["id", "hint", "status", "created_at"],
};

function scalar(v: unknown): string {
  if (v === null || v === undefined) return c.dim("—");
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (Array.isArray(v)) return v.length ? v.map((x) => scalar(x)).join(",") : c.dim("—");
  if (typeof v === "object") return c.dim("{…}");
  return String(v);
}

/** Ancho visible: los codigos ANSI no ocupan columnas aunque ocupen caracteres. */
function width(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function pad(s: string, n: number): string {
  return s + " ".repeat(Math.max(0, n - width(s)));
}

export function renderTable(rows: Record<string, unknown>[], preferred?: string[]): string {
  if (rows.length === 0) return c.dim("(sin resultados)");

  const first = rows[0]!;
  const objectType = typeof first["object"] === "string" ? (first["object"] as string) : null;

  const auto = () =>
    Object.keys(first)
      .filter((k) => k !== "object")
      .filter((k) => {
        const v = first[k];
        return v === null || typeof v !== "object";
      })
      .slice(0, 6);

  // Ojo con `objectType && COLUMNS[objectType]`: si `object` viniera vacio, el `&&`
  // devuelve la cadena vacia —que no es nullish— y el `??` no la rescata. El resultado
  // seria un `columns` de tipo string donde se espera un array.
  const columns = preferred ?? (objectType !== null ? COLUMNS[objectType] : undefined) ?? auto();

  // Si ninguna de las columnas preferidas existe en los datos, se cae a las automaticas.
  // Sin este rescate, un nombre de campo desactualizado en el mapa de arriba no da un
  // error: **imprime una tabla vacia**, que es la peor forma de fallar — el usuario cree
  // que no hay resultados cuando en realidad los hay.
  let present = columns.filter((col) => rows.some((r) => r[col] !== undefined));
  if (present.length === 0) present = auto().filter((col) => rows.some((r) => r[col] !== undefined));
  if (present.length === 0) return c.dim(`(${rows.length} resultado(s) sin campos simples; usa -o json)`);
  const header = present.map((col) => col.toUpperCase().replace(/_/g, " "));
  const body = rows.map((r) => present.map((col) => scalar(r[col])));

  const widths = present.map((_, i) => Math.max(width(header[i]!), ...body.map((r) => width(r[i]!))));

  const lines = [
    present.map((_, i) => c.bold(pad(header[i]!, widths[i]!))).join("  "),
    ...body.map((r) => r.map((cell, i) => pad(cell, widths[i]!)).join("  ")),
  ];
  return lines.map((l) => l.trimEnd()).join("\n");
}

/** Ficha vertical de un solo recurso: mas legible que una tabla de una fila. */
export function renderObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).filter((k) => k !== "object");
  const w = Math.max(...keys.map((k) => k.length));
  return keys
    .map((k) => {
      const v = obj[k];
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        const nested = Object.entries(v as Record<string, unknown>)
          .map(([nk, nv]) => `${" ".repeat(w + 4)}${c.dim(nk)}: ${scalar(nv)}`)
          .join("\n");
        return `${c.dim(pad(k, w))}  ${c.dim("{")}\n${nested}\n${" ".repeat(w + 2)}${c.dim("}")}`;
      }
      return `${c.dim(pad(k, w))}  ${scalar(v)}`;
    })
    .join("\n");
}

/** Serializador YAML minimo: alcanza para volcar una respuesta, no es un emisor completo. */
function toYaml(value: unknown, indent = ""): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((v) => `\n${indent}- ${toYaml(v, indent + "  ").replace(/^\n/, "")}`).join("");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries.map(([k, v]) => `\n${indent}${k}: ${toYaml(v, indent + "  ").replace(/^\n/, "")}`).join("");
  }
  if (typeof value === "string" && /[:#\n]|^\s|\s$/.test(value)) return JSON.stringify(value);
  return String(value);
}

export interface RenderOptions {
  format: OutputFormat;
  /** Ruta con puntos que recorta la salida antes de renderizar. */
  field?: string | undefined;
  /** Columnas explicitas para la tabla. */
  columns?: string[] | undefined;
}

export function render(data: unknown, options: RenderOptions): string {
  const value = options.field ? selectPath(data, options.field) : data;

  // Una coleccion se desenvuelve para todos los formatos: nadie quiere `has_more` en una
  // tabla, y `-o json` de una lista deberia dar la lista.
  const envelope = value as { object?: string; data?: unknown[] } | null;
  const isList = Boolean(envelope && typeof envelope === "object" && envelope.object === "list" && Array.isArray(envelope.data));
  const items = isList ? envelope!.data! : null;

  switch (options.format) {
    case "json":
      return JSON.stringify(items ?? value, null, 2);
    case "jsonl":
      return (items ?? [value]).map((v) => JSON.stringify(v)).join("\n");
    case "yaml":
      return toYaml(items ?? value).replace(/^\n/, "");
    case "id": {
      const source = items ?? [value];
      return source
        .map((v) => (v && typeof v === "object" ? ((v as Record<string, unknown>)["id"] ?? (v as Record<string, unknown>)["name"]) : v))
        .filter((v) => v !== undefined && v !== null)
        .join("\n");
    }
    case "table":
    default:
      if (items) return renderTable(items as Record<string, unknown>[], options.columns);
      if (value && typeof value === "object" && !Array.isArray(value)) return renderObject(value as Record<string, unknown>);
      if (Array.isArray(value)) return renderTable(value as Record<string, unknown>[], options.columns);
      return String(value ?? "");
  }
}

export function parseFormat(value: string | undefined, fallback: OutputFormat = "table"): OutputFormat {
  if (!value) return fallback;
  const allowed: OutputFormat[] = ["table", "json", "jsonl", "id", "yaml"];
  if (!allowed.includes(value as OutputFormat)) {
    throw new Error(`Formato desconocido: ${value}. Opciones: ${allowed.join(", ")}.`);
  }
  return value as OutputFormat;
}
