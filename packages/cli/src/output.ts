/**
 * Output rendering.
 *
 * Rule that runs through the whole file: **the table goes to stdout and everything else
 * to stderr**. Progress, warnings and confirmations never contaminate stdout, so
 * `truo vps list -o json > f.json` produces valid JSON even when the command had
 * something to say along the way.
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
 * Field selector by dotted path: `data.0.hostname`, `resource.id`.
 *
 * It is not JMESPath. It covers the case that shows up in 90% of scripts — pulling one
 * value out of the response — without dragging a dependency into the binary. For real
 * queries there is `-o json | jq`, which is what the docs recommend, and this does not
 * pretend to replace it.
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
 * Preferred columns by object type.
 *
 * Without this the table would show the first keys of the JSON, which is an accidental
 * order. A VPS is identified by id, hostname and state; putting `object` and `vmid`
 * first forces reading the whole row to find what you were looking for.
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
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) return v.length ? v.map((x) => scalar(x)).join(",") : c.dim("—");
  if (typeof v === "object") return c.dim("{…}");
  return String(v);
}

/** Visible width: ANSI codes take up characters but no columns. */
function width(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function pad(s: string, n: number): string {
  return s + " ".repeat(Math.max(0, n - width(s)));
}

export function renderTable(rows: Record<string, unknown>[], preferred?: string[]): string {
  if (rows.length === 0) return c.dim("(no results)");

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

  // Careful with `objectType && COLUMNS[objectType]`: if `object` came in empty, the `&&`
  // returns the empty string — which is not nullish — and the `??` does not rescue it.
  // The result would be a `columns` of type string where an array is expected.
  const columns = preferred ?? (objectType !== null ? COLUMNS[objectType] : undefined) ?? auto();

  // If none of the preferred columns exist in the data, fall back to the automatic ones.
  // Without this rescue, an outdated field name in the map above does not raise an
  // error: **it prints an empty table**, which is the worst way to fail — the user
  // believes there are no results when in fact there are.
  let present = columns.filter((col) => rows.some((r) => r[col] !== undefined));
  if (present.length === 0) present = auto().filter((col) => rows.some((r) => r[col] !== undefined));
  if (present.length === 0) return c.dim(`(${rows.length} result(s) with no simple fields; use -o json)`);
  const header = present.map((col) => col.toUpperCase().replace(/_/g, " "));
  const body = rows.map((r) => present.map((col) => scalar(r[col])));

  const widths = present.map((_, i) => Math.max(width(header[i]!), ...body.map((r) => width(r[i]!))));

  const lines = [
    present.map((_, i) => c.bold(pad(header[i]!, widths[i]!))).join("  "),
    ...body.map((r) => r.map((cell, i) => pad(cell, widths[i]!)).join("  ")),
  ];
  return lines.map((l) => l.trimEnd()).join("\n");
}

/** Vertical card for a single resource: more readable than a one-row table. */
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

/** Minimal YAML serializer: enough to dump a response, not a full emitter. */
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
  /** Dotted path that trims the output before rendering. */
  field?: string | undefined;
  /** Explicit columns for the table. */
  columns?: string[] | undefined;
}

export function render(data: unknown, options: RenderOptions): string {
  const value = options.field ? selectPath(data, options.field) : data;

  // A collection is unwrapped for every format: nobody wants `has_more` in a table, and
  // `-o json` of a list should give the list.
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
    throw new Error(`Unknown format: ${value}. Options: ${allowed.join(", ")}.`);
  }
  return value as OutputFormat;
}
