#!/usr/bin/env node
/**
 * `truo` — entry point.
 *
 * The dispatcher resolves the longest matching command, with builtins winning over
 * generated ones. The "longest wins" rule matters: `truo dns zones list` and
 * `truo dns zones export` are two commands, and the prefix `dns zones` is not one.
 */
import { TruoClient } from "../../sdk/src/index.ts";
import { API_VERSION } from "../../sdk/src/generated/operations.ts";
import { COMMANDS_BY_PATH, type CommandSpec } from "./generated/commands.ts";
import { BUILTINS, type BuiltinCommand } from "./builtins.ts";
import { flagBool, flagString, parseArgs, type ParsedArgs } from "./args.ts";
import { CliError, EXIT } from "./exit.ts";
import { executeCommand, toCliError } from "./execute.ts";
import { commandHelp, groupHelp, rootHelp } from "./help.ts";
import { color, fail, info, out, parseFormat } from "./output.ts";
import { resolve as resolveConfig } from "./config.ts";
import pkg from "../package.json";

/**
 * Comes from `package.json`, not from a constant.
 *
 * `scripts/set-version.ts` writes the tag's version into the three packages; a
 * hand-kept copy here would be the only one that never gets updated, and the
 * symptom — a `truo --version` that lies — shows up exactly when someone
 * reports a bug and says which version they have.
 *
 * It gets inlined by the bundler, so the binary reads no file.
 */
const CLI_VERSION: string = pkg.version;

const BUILTIN_BY_PATH = new Map<string, BuiltinCommand>(BUILTINS.map((b) => [b.path.join(" "), b]));

type Match =
  | { kind: "builtin"; command: BuiltinCommand; rest: string[] }
  | { kind: "generated"; command: CommandSpec; rest: string[] };

/** Finds the most specific command matching the start of `words`. */
function match(words: string[]): Match | null {
  for (let n = Math.min(words.length, 4); n >= 1; n--) {
    const key = words.slice(0, n).join(" ");
    const builtin = BUILTIN_BY_PATH.get(key);
    if (builtin) return { kind: "builtin", command: builtin, rest: words.slice(n) };
    const generated = COMMANDS_BY_PATH[key];
    if (generated) return { kind: "generated", command: generated, rest: words.slice(n) };
  }
  return null;
}

/** Suggestion by edit distance. A typo should not cost a read of --help. */
function suggest(input: string): string | null {
  const candidates = [...BUILTIN_BY_PATH.keys(), ...Object.keys(COMMANDS_BY_PATH)].map((k) => k.split(" ")[0]!);
  let best: { name: string; distance: number } | null = null;
  for (const name of new Set(candidates)) {
    const d = distance(input, name);
    if (d <= 2 && (!best || d < best.distance)) best = { name, distance: d };
  }
  return best?.name ?? null;
}

function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i]![j] = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return rows[a.length]![b.length]!;
}

export async function main(argv: string[]): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    return report(toCliError(err));
  }

  if (flagBool(args.flags, "version") || args.words[0] === "version") {
    out(`truo ${CLI_VERSION}  ${color.dim(`(OpenAPI contract ${API_VERSION})`)}`);
    return EXIT.OK;
  }

  const wantsHelp = flagBool(args.flags, "help") === true || args.words[0] === "help";
  const words = args.words[0] === "help" ? args.words.slice(1) : args.words;

  if (words.length === 0) {
    out(rootHelp(BUILTINS));
    return wantsHelp ? EXIT.OK : EXIT.USAGE;
  }

  const found = match(words);

  if (!found) {
    // It can be a valid group without a command: `truo vps` lists the vps commands.
    const group = groupHelp(words[0]!, BUILTINS);
    if (group) {
      out(group);
      return wantsHelp ? EXIT.OK : EXIT.USAGE;
    }
    const hint = suggest(words[0]!);
    return report(
      new CliError(
        `Unknown command: ${words.join(" ")}`,
        EXIT.USAGE,
        hint ? `Did you mean "truo ${hint}"? If not, run 'truo --help'.` : "Run 'truo --help'.",
      ),
    );
  }

  if (wantsHelp) {
    if (found.kind === "generated") out(commandHelp(found.command));
    else {
      const b = found.command;
      out(
        `${color.bold(b.usage ?? `truo ${b.path.join(" ")}`)}\n\n${b.summary}` +
          (b.details ? `\n\n${color.dim(b.details)}` : "") +
          "\n",
      );
    }
    return EXIT.OK;
  }

  // ── Effective configuration ──────────────────────────────────────────────
  const resolved = resolveConfig({
    token: flagString(args.flags, "token"),
    profile: flagString(args.flags, "profile"),
    baseUrl: flagString(args.flags, "base-url"),
  });

  // The profile's format acts as the default and the flag overrides it; validating here
  // makes `-o jsno` fail before spending an API call.
  if (!args.flags.has("output") && resolved.output) args.flags.set("output", resolved.output);
  try {
    parseFormat(flagString(args.flags, "output"));
  } catch (err) {
    return report(new CliError((err as Error).message, EXIT.USAGE));
  }

  let cached: TruoClient | null = null;
  const client = (): TruoClient => {
    if (cached) return cached;
    if (!resolved.token) {
      throw new CliError("No credential found.", EXIT.UNAUTHENTICATED, "Run 'truo auth login' or set TRUO_TOKEN.");
    }
    cached = new TruoClient({
      token: resolved.token,
      ...(resolved.baseUrl ? { baseUrl: resolved.baseUrl } : {}),
      userAgent: `truo-cli/${CLI_VERSION}`,
    });
    return cached;
  };

  try {
    if (found.kind === "builtin") {
      if (!found.command.anonymous && !resolved.token) {
        throw new CliError("No credential found.", EXIT.UNAUTHENTICATED, "Run 'truo auth login' or set TRUO_TOKEN.");
      }
      return await found.command.run({ args, positionals: found.rest, client, resolved });
    }
    return await executeCommand(found.command, { client: client(), args, positionals: found.rest });
  } catch (err) {
    return report(toCliError(err));
  }
}

function report(err: CliError): number {
  fail(`${color.bold("Error:")} ${err.message}`);
  if (err.hint) info(color.dim(err.hint));
  return err.code;
}

// Ctrl-C gets its own exit code (130) by convention: a script can tell it was cancelled
// by a human rather than failed by the API.
process.on("SIGINT", () => {
  process.stderr.write("\n");
  process.exit(EXIT.SIGINT);
});

// `import.meta.main` is Bun-only; the argv check covers Node.
const isEntry =
  (import.meta as { main?: boolean }).main === true ||
  (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop() ?? ""));

if (isEntry) {
  // `exitCode` is assigned instead of calling `process.exit()`.
  //
  // `process.exit()` kills the process with handles still live — the fetch pool's
  // sockets, a pending write to a stdout that is a pipe — and on Windows that makes
  // libuv abort with `UV_HANDLE_CLOSING`. The process dies with code 127 instead of 0,
  // so any script checking `$?` sees a failure where there was none. Letting the event
  // loop drain on its own, the output completes and the code arrives intact.
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      fail(`Internal error: ${err instanceof Error ? err.stack : String(err)}`);
      process.exitCode = EXIT.INTERNAL;
    });
}
