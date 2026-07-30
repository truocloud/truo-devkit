/**
 * Argument parser.
 *
 * Written by hand instead of using `commander` because the command tree already comes
 * generated from the OpenAPI spec: there are no `.command().option().action()` chains to
 * write, just a dispatcher over data. An imperative library would provide API for
 * hand-building exactly what we do not hand-build, in exchange for a dependency in a
 * binary we want to compile single-file.
 */
import { CliError, EXIT } from "./exit.ts";

export interface ParsedArgs {
  /** Segments before the first `--flag`: `["vps","power","svc_1","stop"]`. */
  words: string[];
  /** Values by flag name, without `--`. Repeating a flag accumulates an array. */
  flags: Map<string, string | boolean | string[]>;
  /** Whatever comes after `--`, untouched (used by `truo vps ssh -- -p 2222`). */
  passthrough: string[];
}

/** Single-letter aliases. Deliberately few: the ones typed a hundred times a day. */
const SHORT: Record<string, string> = {
  o: "output",
  h: "help",
  y: "yes",
  q: "quiet",
  v: "version",
};

export function parseArgs(argv: string[]): ParsedArgs {
  const words: string[] = [];
  const flags = new Map<string, string | boolean | string[]>();
  const passthrough: string[] = [];

  let i = 0;
  for (; i < argv.length; i++) {
    const token = argv[i]!;

    if (token === "--") {
      passthrough.push(...argv.slice(i + 1));
      break;
    }

    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      let name = eq >= 0 ? token.slice(2, eq) : token.slice(2);
      let value: string | boolean;

      if (eq >= 0) {
        value = token.slice(eq + 1);
      } else if (name.startsWith("no-")) {
        // `--no-wait` turns `wait` off. It is the only way to negate a boolean that
        // defaults to true without inventing `--wait=false`.
        name = name.slice(3);
        value = false;
      } else {
        const next = argv[i + 1];
        // A value starting with `-` is ambiguous: it could be the value (`--query -1`) or
        // the next flag. Resolved in favor of "boolean", which is what it almost always
        // is; the other case has `--flag=-1`.
        if (next !== undefined && !next.startsWith("-")) {
          value = next;
          i++;
        } else {
          value = true;
        }
      }
      push(flags, name, value);
      continue;
    }

    if (token.startsWith("-") && token.length > 1 && token !== "-") {
      // `-abc` is not expanded into three flags: in this CLI no combination makes sense
      // and accepting it would only produce hard-to-read errors.
      const letter = token.slice(1);
      const name = SHORT[letter];
      if (!name) {
        throw new CliError(`Unknown flag: -${letter}`, EXIT.USAGE, "Run 'truo --help'.");
      }
      const next = argv[i + 1];
      if (name === "help" || name === "version" || name === "yes" || name === "quiet") {
        push(flags, name, true);
      } else if (next !== undefined && !next.startsWith("-")) {
        push(flags, name, next);
        i++;
      } else {
        push(flags, name, true);
      }
      continue;
    }

    words.push(token);
  }

  return { words, flags, passthrough };
}

function push(flags: Map<string, string | boolean | string[]>, name: string, value: string | boolean): void {
  const prev = flags.get(name);
  if (prev === undefined) {
    flags.set(name, value);
    return;
  }
  const arr = Array.isArray(prev) ? prev : [String(prev)];
  arr.push(String(value));
  flags.set(name, arr);
}

export function flagString(flags: ParsedArgs["flags"], name: string): string | undefined {
  const v = flags.get(name);
  if (v === undefined || typeof v === "boolean") return undefined;
  return Array.isArray(v) ? v[v.length - 1] : v;
}

export function flagBool(flags: ParsedArgs["flags"], name: string): boolean | undefined {
  const v = flags.get(name);
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  if (v === "false" || v === "0" || v === "no") return false;
  return true;
}

export function flagList(flags: ParsedArgs["flags"], name: string): string[] {
  const v = flags.get(name);
  if (v === undefined || typeof v === "boolean") return [];
  return Array.isArray(v) ? v : [v];
}
