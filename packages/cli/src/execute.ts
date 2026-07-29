/**
 * Ejecuta un comando generado: mapea argumentos a un request, lo manda y renderiza.
 *
 * Un solo archivo cubre las 100 operaciones de la API porque todo lo especifico de cada
 * una —donde va cada argumento, si es peligrosa, si hay que esperarla— viaja en el
 * `CommandSpec` que salio del spec. Agregar un endpoint no toca este codigo.
 */
import { TruoClient, TruoError, OperationTimeoutError, OperationFailedError } from "../../sdk/src/index.ts";
import type { Operation } from "../../sdk/src/generated/types.ts";
import type { CommandSpec, Flag, Positional } from "./generated/commands.ts";
import { flagBool, flagString, type ParsedArgs } from "./args.ts";
import { CliError, EXIT, exitCodeForStatus } from "./exit.ts";
import { color, info, out, parseFormat, render, warn } from "./output.ts";
import { confirm } from "./prompt.ts";

export interface ExecContext {
  client: TruoClient;
  args: ParsedArgs;
  /** Palabras que quedaron despues del nombre del comando. */
  positionals: string[];
}

function coerce(value: string, type: Flag["type"] | Positional["type"], label: string): unknown {
  switch (type) {
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new CliError(`${label}: se esperaba un numero, llego "${value}".`);
      return n;
    }
    case "boolean":
      return !["false", "0", "no"].includes(value.toLowerCase());
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        throw new CliError(`${label}: se esperaba JSON valido, llego "${value.slice(0, 40)}".`);
      }
    case "string[]":
      // Se acepta repetir la flag o separar por comas; las dos formas aparecen en la vida real.
      return value.includes(",") ? value.split(",").map((s) => s.trim()) : [value];
    default:
      return value;
  }
}

function checkEnum(value: unknown, values: string[] | undefined, label: string): void {
  if (!values || typeof value !== "string") return;
  if (!values.includes(value)) {
    throw new CliError(`${label}: "${value}" no es un valor valido.`, EXIT.USAGE, `Opciones: ${values.join(", ")}.`);
  }
}

export async function executeCommand(spec: CommandSpec, ctx: ExecContext): Promise<number> {
  const { args, positionals } = ctx;

  // ── Posicionales ─────────────────────────────────────────────────────────
  const path: Record<string, string | number> = {};
  const body: Record<string, unknown> = {};
  const query: Record<string, unknown> = {};

  const required = spec.positionals.filter((p) => p.required);
  if (positionals.length < required.length) {
    const missing = required.slice(positionals.length).map((p) => `<${p.label}>`);
    throw new CliError(
      `Falta ${missing.length === 1 ? "el argumento" : "los argumentos"} ${missing.join(" ")}.`,
      EXIT.USAGE,
      `Uso: truo ${spec.path.join(" ")} ${spec.positionals.map((p) => (p.required ? `<${p.label}>` : `[${p.label}]`)).join(" ")}`,
    );
  }
  if (positionals.length > spec.positionals.length) {
    throw new CliError(
      `Sobran argumentos: ${positionals.slice(spec.positionals.length).join(" ")}.`,
      EXIT.USAGE,
      `Uso: truo ${spec.path.join(" ")} ${spec.positionals.map((p) => `<${p.label}>`).join(" ")}`,
    );
  }

  spec.positionals.forEach((p, i) => {
    const raw = positionals[i];
    if (raw === undefined) return;
    const value = coerce(raw, p.type ?? "string", `<${p.label}>`);
    checkEnum(value, p.values, `<${p.label}>`);
    if (p.in === "path") path[p.key] = raw;
    else if (p.in === "body") body[p.key] = value;
    else query[p.key] = value;
  });

  // ── Flags ────────────────────────────────────────────────────────────────
  for (const f of spec.flags) {
    const raw = args.flags.get(f.flag);
    if (raw === undefined) {
      if (f.required && f.in === "body") {
        throw new CliError(`Falta --${f.flag}.`, EXIT.USAGE, f.description);
      }
      continue;
    }
    const value =
      typeof raw === "boolean"
        ? f.type === "boolean"
          ? raw
          : (() => {
              throw new CliError(`--${f.flag} necesita un valor.`, EXIT.USAGE, f.description);
            })()
        : Array.isArray(raw)
          ? f.type === "string[]"
            ? raw
            : coerce(raw[raw.length - 1]!, f.type, `--${f.flag}`)
          : coerce(raw, f.type, `--${f.flag}`);
    checkEnum(value, f.values, `--${f.flag}`);
    if (f.in === "query") query[f.key] = value;
    else if (f.in === "body") body[f.key] = value;
    else path[f.key] = value as string;
  }

  // `--body-json` siempre esta disponible: es la valvula de escape para un body que las
  // flags no cubren (o que el spec declara libre) sin tener que esperar una version nueva.
  const bodyJson = flagString(args.flags, "body-json");
  let finalBody: unknown = Object.keys(body).length ? body : undefined;
  if (bodyJson !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyJson);
    } catch {
      throw new CliError("--body-json no es JSON valido.");
    }
    finalBody =
      parsed && typeof parsed === "object" && !Array.isArray(parsed) && finalBody
        ? { ...(finalBody as object), ...(parsed as object) }
        : parsed;
  }
  if (spec.bodyRequired && finalBody === undefined) {
    throw new CliError(
      `Este comando necesita un cuerpo.`,
      EXIT.USAGE,
      spec.freeformBody
        ? "Pasalo con --body-json '{…}'."
        : `Usa las flags: ${spec.flags.filter((f) => f.in === "body").map((f) => `--${f.flag}`).join(" ")}`,
    );
  }

  // ── Confirmacion de lo destructivo ───────────────────────────────────────
  // El gate mira `x-truo-danger`, la misma clasificacion que usara el servidor MCP. Una
  // sola taxonomia para las dos superficies: lo que aca pide confirmacion, alla la pide.
  if (spec.danger === "destructive" && !flagBool(args.flags, "yes")) {
    const target = Object.values(path)[0] ?? spec.path.join(" ");
    const ok = await confirm(
      `${color.red("Operacion destructiva")}: ${spec.summary || spec.operationId} sobre ${color.bold(String(target))}. ` +
        `No tiene vuelta atras.`,
    );
    if (!ok) {
      info("Cancelado.");
      return EXIT.ABORTED;
    }
  }

  if (spec.deprecated) {
    warn(`[truo] "${spec.path.join(" ")}" esta deprecado y va a dejar de existir. Corre 'truo api-changelog'.`);
  }

  // ── Request ──────────────────────────────────────────────────────────────
  const format = parseFormat(flagString(args.flags, "output"));
  const field = flagString(args.flags, "field");
  const quiet = flagBool(args.flags, "quiet") === true;
  const idempotencyKey = flagString(args.flags, "idempotency-key");

  let data: unknown;
  try {
    const res = await ctx.client.request(spec.operationId, {
      path,
      body: finalBody,
      queryKeys: Object.keys(query),
      params: { ...query, ...(idempotencyKey ? { idempotencyKey } : {}) },
    });
    data = res.data;
  } catch (err) {
    throw toCliError(err);
  }

  // ── Espera de operaciones asincronas ─────────────────────────────────────
  // Se espera por defecto. Un CLI que devuelve antes de que la cosa pase obliga a todo
  // script a escribir su propio bucle de polling — y la mitad no lo escribe.
  const wantsWait = flagBool(args.flags, "wait") !== false;
  const op = data as Partial<Operation> | null;
  if (spec.longRunning && wantsWait && op && op.object === "operation" && op.id) {
    if (op.status === "succeeded" || op.status === "failed") {
      // Una operacion `inline` ya termino: esperarla seria una consulta al pedo.
    } else {
      try {
        data = await waitWithProgress(ctx.client, op.id, quiet);
      } catch (err) {
        if (err instanceof OperationTimeoutError) {
          throw new CliError(err.message, EXIT.OPERATION_TIMEOUT, `Retomala con: truo operation wait ${err.operationId}`);
        }
        if (err instanceof OperationFailedError) {
          throw new CliError(err.message, EXIT.API_ERROR);
        }
        throw toCliError(err);
      }
    }
  }

  if (data !== null && data !== undefined) out(render(data, { format, field }));
  else if (!quiet) info(color.green("Listo."));
  return EXIT.OK;
}

async function waitWithProgress(client: TruoClient, operationId: string, quiet: boolean): Promise<Operation> {
  let last = "";
  return client.operations.wait(operationId, {
    onProgress: (op) => {
      if (quiet || !process.stderr.isTTY) return;
      const line = `  ${op.status}${op.progress !== null ? ` ${op.progress}%` : ""}`;
      if (line === last) return;
      last = line;
      process.stderr.write(`\r${color.dim(line.padEnd(40))}`);
    },
  }).finally(() => {
    if (!quiet && process.stderr.isTTY) process.stderr.write("\r" + " ".repeat(40) + "\r");
  });
}

export function toCliError(err: unknown): CliError {
  if (err instanceof CliError) return err;
  if (err instanceof TruoError) {
    const code = err.status ? exitCodeForStatus(err.status) : EXIT.API_ERROR;
    const hints: string[] = [];
    if (err.code === "insufficient_scope") hints.push("La API key no tiene el scope necesario. Crea una nueva desde el panel.");
    if (err.code === "insufficient_permission") hints.push("Tu usuario no tiene ese permiso; pediselo al dueño de la cuenta.");
    if (err.status === 404) hints.push("O no existe, o esta credencial no puede verlo — la API no distingue los dos casos a proposito.");
    if (err.requestId) hints.push(`request_id: ${err.requestId}`);
    return new CliError(err.message, code, hints.join("\n") || undefined);
  }
  if (err instanceof Error) return new CliError(err.message, EXIT.INTERNAL);
  return new CliError(String(err), EXIT.INTERNAL);
}
