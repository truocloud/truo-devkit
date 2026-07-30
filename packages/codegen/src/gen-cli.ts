/**
 * Generates the CLI command tree from the spec's `x-truo-cli` extension.
 *
 * The CLI has not a single hand-written command for API operations: if a new operation
 * declares `x-truo-cli`, the command exists on the next `bun run gen`. That is what makes
 * the parity "everything the API can do, the CLI can do" a property of the build rather
 * than a promise in the documentation.
 */
import { resolve } from "node:path";
import type { JsonSchema, OpenApiDocument } from "../../openapi/src/index.ts";
import type { OpIR } from "./ir.ts";
import { BANNER, quoteKey, writeGenerated, type WriteResult } from "./util.ts";

const CLI = (f: string) => resolve(import.meta.dirname, "../../cli/src/generated", f);

type FlagType = "string" | "number" | "boolean" | "json" | "string[]";

function kebab(name: string): string {
  return name
    .replace(/_/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[_\-.]/g, "");
}

function deref(schema: JsonSchema | undefined | null, doc: OpenApiDocument): JsonSchema | null {
  if (!schema) return null;
  if (!schema.$ref) return schema;
  const name = schema.$ref.split("/").pop()!;
  const found = doc.components?.schemas?.[name];
  return found ? deref(found, doc) : null;
}

function flagType(schema: JsonSchema, doc: OpenApiDocument): FlagType {
  const s = deref(schema, doc) ?? schema;
  const types = Array.isArray(s.type) ? s.type : s.type ? [s.type] : [];
  const t = types.find((x) => x !== "null");
  if (s.enum) return "string";
  if (t === "boolean") return "boolean";
  if (t === "number" || t === "integer") return "number";
  if (t === "array") {
    const item = deref(s.items, doc);
    const it = Array.isArray(item?.type) ? item?.type[0] : item?.type;
    return it === "string" ? "string[]" : "json";
  }
  if (t === "object") return "json";
  return "string";
}

function enumValues(schema: JsonSchema, doc: OpenApiDocument): string[] | null {
  const s = deref(schema, doc) ?? schema;
  if (!s.enum) return null;
  return s.enum.filter((v): v is string => typeof v === "string");
}

export function genCli(ops: OpIR[], doc: OpenApiDocument, check: boolean): WriteResult[] {
  const commands: unknown[] = [];

  for (const op of ops) {
    if (!op.cli) continue;

    const bodySchema = op.body ? (deref(op.body.schema, doc) ?? {}) : null;
    const bodyProps = bodySchema?.properties ?? {};
    const bodyRequired = new Set(bodySchema?.required ?? []);
    const consumedBody = new Set<string>();

    // ── Positionals ─────────────────────────────────────────────────────────
    // The names in `x-truo-cli.positional` are user-facing (`service_id`), not the
    // spec's (`id`). They are resolved in order against the path parameters and, once
    // those run out, against the body properties — which is how `truo vps power
    // svc_1 stop` places an argument that travels in the body over HTTP.
    const pathQueue = [...op.pathParams];
    const positionals: unknown[] = [];

    for (const label of op.cli.positional) {
      const exact = pathQueue.findIndex((p) => normalize(p.name) === normalize(label));
      if (exact >= 0) {
        const p = pathQueue.splice(exact, 1)[0]!;
        positionals.push({
          label,
          in: "path",
          key: p.name,
          required: true,
          ...(p.description ? { description: p.description } : {}),
        });
        continue;
      }
      if (pathQueue.length > 0) {
        const p = pathQueue.shift()!;
        positionals.push({
          label,
          in: "path",
          key: p.name,
          required: true,
          ...(p.description ? { description: p.description } : {}),
        });
        continue;
      }
      const bodyKey = Object.keys(bodyProps).find((k) => normalize(k) === normalize(label));
      if (bodyKey) {
        const schema = bodyProps[bodyKey]!;
        consumedBody.add(bodyKey);
        const values = enumValues(schema, doc);
        positionals.push({
          label,
          in: "body",
          key: bodyKey,
          required: bodyRequired.has(bodyKey),
          type: flagType(schema, doc),
          ...(values ? { values } : {}),
          ...(schema.description ? { description: schema.description } : {}),
        });
        continue;
      }
      throw new Error(
        `${op.id}: the x-truo-cli positional "${label}" does not match any path parameter ` +
          `or body property. Fix the extension in the API.`,
      );
    }

    // A path param not covered by a positional would be impossible to pass.
    if (pathQueue.length) {
      throw new Error(
        `${op.id}: x-truo-cli does not cover the path parameter(s) ${pathQueue
          .map((p) => p.name)
          .join(", ")}. Add them to "positional" in the API.`,
      );
    }

    // ── Flags ───────────────────────────────────────────────────────────────
    const flags: unknown[] = [];
    for (const p of op.queryParams) {
      const values = enumValues(p.schema, doc);
      flags.push({
        flag: kebab(p.name),
        key: p.name,
        in: "query",
        type: flagType(p.schema, doc),
        required: p.required,
        ...(values ? { values } : {}),
        ...(p.description ? { description: p.description } : {}),
      });
    }
    for (const [key, schema] of Object.entries(bodyProps)) {
      if (consumedBody.has(key)) continue;
      const values = enumValues(schema, doc);
      flags.push({
        flag: kebab(key),
        key,
        in: "body",
        type: flagType(schema, doc),
        required: bodyRequired.has(key),
        ...(values ? { values } : {}),
        ...(schema.description ? { description: schema.description } : {}),
      });
    }

    // A body with no declared properties (or with free `additionalProperties`) cannot be
    // covered with flags; those get `--body-json`, which the runtime always accepts.
    const freeformBody = Boolean(op.body) && Object.keys(bodyProps).length === 0;

    commands.push({
      path: op.cli.command.split(/\s+/).filter(Boolean),
      operationId: op.id,
      summary: op.summary,
      description: op.description,
      danger: op.danger,
      longRunning: op.longRunning,
      deprecated: op.deprecated,
      scope: op.scope,
      bodyRequired: op.body?.required === true,
      freeformBody,
      positionals,
      flags,
    });
  }

  // Two operations cannot claim the same command.
  const byCommand = new Map<string, string>();
  for (const c of commands as { path: string[]; operationId: string }[]) {
    const key = c.path.join(" ");
    const prev = byCommand.get(key);
    if (prev) {
      throw new Error(`The command "truo ${key}" is claimed by two operations: ${prev} and ${c.operationId}.`);
    }
    byCommand.set(key, c.operationId);
  }

  const file =
    BANNER +
    `
/** Where an argument's value goes when the request is built. */
export type ArgIn = "path" | "query" | "body";

export interface Positional {
  /** How it is named in the help: \`<service_id>\`. */
  label: string;
  in: ArgIn;
  /** Actual key in the spec (the path uses \`id\`, even if the help says \`service_id\`). */
  key: string;
  required: boolean;
  type?: "string" | "number" | "boolean" | "json" | "string[]";
  /** Allowed values, if the schema enumerates them. */
  values?: string[];
  description?: string;
}

export interface Flag {
  /** Name on the command line, without \`--\`. */
  flag: string;
  key: string;
  in: ArgIn;
  type: "string" | "number" | "boolean" | "json" | "string[]";
  required: boolean;
  values?: string[];
  description?: string;
}

export interface CommandSpec {
  /** \`["vps","power"]\` → \`truo vps power\`. */
  path: string[];
  operationId: string;
  summary: string;
  description: string;
  danger: "none" | "reversible" | "destructive";
  longRunning: boolean;
  deprecated: boolean;
  scope: string | null;
  bodyRequired: boolean;
  /** The body declares no properties: it can only be sent with \`--body-json\`. */
  freeformBody: boolean;
  positionals: Positional[];
  flags: Flag[];
}

/** The ${commands.length} commands derived from the spec. */
export const COMMANDS: CommandSpec[] = ${JSON.stringify(commands, null, 2)};

/** Indexed by \`truo <a> <b>\`, which is how the dispatcher looks them up. */
export const COMMANDS_BY_PATH: Record<string, CommandSpec> = Object.fromEntries(
  COMMANDS.map((c) => [c.path.join(" "), c]),
);
`;

  const bare = ops.filter((o) => !o.cli).map((o) => o.id);
  if (bare.length) {
    console.warn(
      `  warning: ${bare.length} operation(s) without x-truo-cli, invisible to the CLI ` +
        `(reachable via 'truo api'): ${bare.join(", ")}`,
    );
  }

  return [writeGenerated(CLI("commands.ts"), file, check)];
}

// Re-exported so the runner can name the key without duplicating the helper.
export { quoteKey };
