/**
 * Genera el arbol de comandos del CLI a partir de `x-truo-cli` del spec.
 *
 * El CLI no tiene ni un comando escrito a mano para las operaciones de la API: si una
 * operacion nueva declara `x-truo-cli`, el comando existe en el siguiente `bun run gen`.
 * Eso es lo que hace que la paridad "todo lo que puede la API lo puede el CLI" sea una
 * propiedad del build y no una promesa de la documentacion.
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

    // ── Posicionales ────────────────────────────────────────────────────────
    // Los nombres de `x-truo-cli.positional` son de cara al usuario (`service_id`), no
    // los del spec (`id`). Se resuelven en orden contra los parametros de path y, cuando
    // esos se agotan, contra las propiedades del body — que es como `truo vps power
    // svc_1 stop` acomoda un argumento que en HTTP viaja en el cuerpo.
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
        `${op.id}: el posicional "${label}" de x-truo-cli no corresponde a ningun parametro de path ` +
          `ni a una propiedad del body. Corregi la extension en la API.`,
      );
    }

    // Un path param que no quedo cubierto por un posicional seria imposible de pasar.
    if (pathQueue.length) {
      throw new Error(
        `${op.id}: x-truo-cli no cubre el/los parametro(s) de path ${pathQueue
          .map((p) => p.name)
          .join(", ")}. Agregalos a "positional" en la API.`,
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

    // Un body sin propiedades declaradas (o con `additionalProperties` libre) no se puede
    // cubrir con flags; para esos queda `--body-json`, que el runtime siempre acepta.
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

  // Dos operaciones no pueden reclamar el mismo comando.
  const byCommand = new Map<string, string>();
  for (const c of commands as { path: string[]; operationId: string }[]) {
    const key = c.path.join(" ");
    const prev = byCommand.get(key);
    if (prev) {
      throw new Error(`El comando "truo ${key}" lo reclaman dos operaciones: ${prev} y ${c.operationId}.`);
    }
    byCommand.set(key, c.operationId);
  }

  const file =
    BANNER +
    `
/** De donde sale el valor de un argumento cuando se arma el request. */
export type ArgIn = "path" | "query" | "body";

export interface Positional {
  /** Como se llama en la ayuda: \`<service_id>\`. */
  label: string;
  in: ArgIn;
  /** Clave real en el spec (el path usa \`id\`, aunque la ayuda diga \`service_id\`). */
  key: string;
  required: boolean;
  type?: "string" | "number" | "boolean" | "json" | "string[]";
  /** Valores admitidos, si el schema los enumera. */
  values?: string[];
  description?: string;
}

export interface Flag {
  /** Nombre en la linea de comandos, sin \`--\`. */
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
  /** El body no declara propiedades: solo se puede mandar con \`--body-json\`. */
  freeformBody: boolean;
  positionals: Positional[];
  flags: Flag[];
}

/** Los ${commands.length} comandos derivados del spec. */
export const COMMANDS: CommandSpec[] = ${JSON.stringify(commands, null, 2)};

/** Indexados por \`truo <a> <b>\`, que es como los busca el dispatcher. */
export const COMMANDS_BY_PATH: Record<string, CommandSpec> = Object.fromEntries(
  COMMANDS.map((c) => [c.path.join(" "), c]),
);
`;

  const bare = ops.filter((o) => !o.cli).map((o) => o.id);
  if (bare.length) {
    console.warn(
      `  aviso: ${bare.length} operacion(es) sin x-truo-cli, invisibles para el CLI ` +
        `(alcanzables con 'truo api'): ${bare.join(", ")}`,
    );
  }

  return [writeGenerated(CLI("commands.ts"), file, check)];
}

// Se re-exporta para que el runner pueda nombrar la clave sin duplicar el helper.
export { quoteKey };
