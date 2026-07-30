/**
 * Executes a generated command: maps arguments to a request, sends it and renders.
 *
 * A single file covers the API's 100 operations because everything specific to each one
 * — where each argument goes, whether it is dangerous, whether it must be awaited —
 * travels in the `CommandSpec` that came out of the spec. Adding an endpoint does not
 * touch this code.
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
  /** Words left over after the command name. */
  positionals: string[];
}

function coerce(value: string, type: Flag["type"] | Positional["type"], label: string): unknown {
  switch (type) {
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new CliError(`${label}: expected a number, got "${value}".`);
      return n;
    }
    case "boolean":
      return !["false", "0", "no"].includes(value.toLowerCase());
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        throw new CliError(`${label}: expected valid JSON, got "${value.slice(0, 40)}".`);
      }
    case "string[]":
      // Repeating the flag and comma-separating are both accepted; both show up in the wild.
      return value.includes(",") ? value.split(",").map((s) => s.trim()) : [value];
    default:
      return value;
  }
}

function checkEnum(value: unknown, values: string[] | undefined, label: string): void {
  if (!values || typeof value !== "string") return;
  if (!values.includes(value)) {
    throw new CliError(`${label}: "${value}" is not a valid value.`, EXIT.USAGE, `Options: ${values.join(", ")}.`);
  }
}

export async function executeCommand(spec: CommandSpec, ctx: ExecContext): Promise<number> {
  const { args, positionals } = ctx;

  // ── Positionals ──────────────────────────────────────────────────────────
  const path: Record<string, string | number> = {};
  const body: Record<string, unknown> = {};
  const query: Record<string, unknown> = {};

  const required = spec.positionals.filter((p) => p.required);
  if (positionals.length < required.length) {
    const missing = required.slice(positionals.length).map((p) => `<${p.label}>`);
    throw new CliError(
      `Missing ${missing.length === 1 ? "argument" : "arguments"} ${missing.join(" ")}.`,
      EXIT.USAGE,
      `Usage: truo ${spec.path.join(" ")} ${spec.positionals.map((p) => (p.required ? `<${p.label}>` : `[${p.label}]`)).join(" ")}`,
    );
  }
  if (positionals.length > spec.positionals.length) {
    throw new CliError(
      `Too many arguments: ${positionals.slice(spec.positionals.length).join(" ")}.`,
      EXIT.USAGE,
      `Usage: truo ${spec.path.join(" ")} ${spec.positionals.map((p) => `<${p.label}>`).join(" ")}`,
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
        throw new CliError(`Missing --${f.flag}.`, EXIT.USAGE, f.description);
      }
      continue;
    }
    const value =
      typeof raw === "boolean"
        ? f.type === "boolean"
          ? raw
          : (() => {
              throw new CliError(`--${f.flag} needs a value.`, EXIT.USAGE, f.description);
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

  // `--body-json` is always available: it is the escape valve for a body the flags do not
  // cover (or that the spec declares free-form) without waiting for a new release.
  const bodyJson = flagString(args.flags, "body-json");
  let finalBody: unknown = Object.keys(body).length ? body : undefined;
  if (bodyJson !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyJson);
    } catch {
      throw new CliError("--body-json is not valid JSON.");
    }
    finalBody =
      parsed && typeof parsed === "object" && !Array.isArray(parsed) && finalBody
        ? { ...(finalBody as object), ...(parsed as object) }
        : parsed;
  }
  if (spec.bodyRequired && finalBody === undefined) {
    throw new CliError(
      `This command needs a body.`,
      EXIT.USAGE,
      spec.freeformBody
        ? "Pass it with --body-json '{…}'."
        : `Use the flags: ${spec.flags.filter((f) => f.in === "body").map((f) => `--${f.flag}`).join(" ")}`,
    );
  }

  // ── Confirmation for destructive operations ──────────────────────────────
  // The gate looks at `x-truo-danger`, the same classification the MCP server will use.
  // One taxonomy for both surfaces: what asks for confirmation here asks for it there.
  if (spec.danger === "destructive" && !flagBool(args.flags, "yes")) {
    const target = Object.values(path)[0] ?? spec.path.join(" ");
    const ok = await confirm(
      `${color.red("Destructive operation")}: ${spec.summary || spec.operationId} on ${color.bold(String(target))}. ` +
        `There is no undo.`,
    );
    if (!ok) {
      info("Cancelled.");
      return EXIT.ABORTED;
    }
  }

  if (spec.deprecated) {
    warn(`[truo] "${spec.path.join(" ")}" is deprecated and going away. Run 'truo api-changelog'.`);
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

  // ── Waiting on asynchronous operations ───────────────────────────────────
  // Waiting is the default. A CLI that returns before the thing happens forces every
  // script to write its own polling loop — and half of them never do.
  const wantsWait = flagBool(args.flags, "wait") !== false;
  const op = data as Partial<Operation> | null;
  if (spec.longRunning && wantsWait && op && op.object === "operation" && op.id) {
    if (op.status === "succeeded" || op.status === "failed") {
      // An `inline` operation already finished: waiting would be a pointless poll.
    } else {
      try {
        data = await waitWithProgress(ctx.client, op.id, quiet);
      } catch (err) {
        if (err instanceof OperationTimeoutError) {
          throw new CliError(err.message, EXIT.OPERATION_TIMEOUT, `Resume it with: truo operation wait ${err.operationId}`);
        }
        if (err instanceof OperationFailedError) {
          throw new CliError(err.message, EXIT.API_ERROR);
        }
        throw toCliError(err);
      }
    }
  }

  if (data !== null && data !== undefined) out(render(data, { format, field }));
  else if (!quiet) info(color.green("Done."));
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
    if (err.code === "insufficient_scope") hints.push("The API key does not have the required scope. Create a new one from the panel.");
    if (err.code === "insufficient_permission") hints.push("Your user does not have that permission; ask the account owner for it.");
    if (err.status === 404) hints.push("Either it does not exist, or this credential cannot see it — the API does not distinguish the two on purpose.");
    if (err.requestId) hints.push(`request_id: ${err.requestId}`);
    return new CliError(err.message, code, hints.join("\n") || undefined);
  }
  if (err instanceof Error) return new CliError(err.message, EXIT.INTERNAL);
  return new CliError(String(err), EXIT.INTERNAL);
}
