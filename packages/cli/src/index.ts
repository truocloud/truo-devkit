#!/usr/bin/env node
/**
 * `truo` — punto de entrada.
 *
 * El dispatcher resuelve el comando mas largo que coincide, con los builtins ganandole a
 * lo generado. La regla de "el mas largo gana" importa: `truo dns zones list` y
 * `truo dns zones export` son dos comandos y el prefijo `dns zones` no es ninguno.
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
 * Sale del `package.json`, no de una constante.
 *
 * `scripts/set-version.ts` escribe la version del tag en los tres paquetes; una
 * copia a mano acá seria la unica que no se actualiza, y el sintoma —un
 * `truo --version` que miente— aparece justo cuando alguien reporta un bug y
 * dice que version tiene.
 *
 * Queda inlineado por el bundler, asi que el binario no lee ningun archivo.
 */
const CLI_VERSION: string = pkg.version;

const BUILTIN_BY_PATH = new Map<string, BuiltinCommand>(BUILTINS.map((b) => [b.path.join(" "), b]));

type Match =
  | { kind: "builtin"; command: BuiltinCommand; rest: string[] }
  | { kind: "generated"; command: CommandSpec; rest: string[] };

/** Busca el comando mas especifico que coincida con el principio de `words`. */
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

/** Sugerencia por distancia de edicion. Un typo no deberia costar una lectura del --help. */
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
    out(`truo ${CLI_VERSION}  ${color.dim(`(contrato OpenAPI ${API_VERSION})`)}`);
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
    // Puede ser un grupo valido sin comando: `truo vps` lista los comandos de vps.
    const group = groupHelp(words[0]!, BUILTINS);
    if (group) {
      out(group);
      return wantsHelp ? EXIT.OK : EXIT.USAGE;
    }
    const hint = suggest(words[0]!);
    return report(
      new CliError(
        `Comando desconocido: ${words.join(" ")}`,
        EXIT.USAGE,
        hint ? `¿Quisiste decir "truo ${hint}"? Si no, corre 'truo --help'.` : "Corre 'truo --help'.",
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

  // ── Configuracion efectiva ───────────────────────────────────────────────
  const resolved = resolveConfig({
    token: flagString(args.flags, "token"),
    profile: flagString(args.flags, "profile"),
    baseUrl: flagString(args.flags, "base-url"),
  });

  // El formato del perfil actua de default y la flag lo pisa; validar aca hace que un
  // `-o jsno` falle antes de gastar una llamada a la API.
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
      throw new CliError("No hay credencial.", EXIT.UNAUTHENTICATED, "Corre 'truo auth login', o exporta TRUO_TOKEN.");
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
        throw new CliError("No hay credencial.", EXIT.UNAUTHENTICATED, "Corre 'truo auth login', o exporta TRUO_TOKEN.");
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

// Ctrl-C tiene un codigo propio (130) por convencion: un script sabe que lo cancelo un
// humano y no que fallo la API.
process.on("SIGINT", () => {
  process.stderr.write("\n");
  process.exit(EXIT.SIGINT);
});

// `import.meta.main` es de Bun; el chequeo por argv cubre Node.
const isEntry =
  (import.meta as { main?: boolean }).main === true ||
  (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop() ?? ""));

if (isEntry) {
  // Se asigna `exitCode` en vez de llamar a `process.exit()`.
  //
  // `process.exit()` corta el proceso con handles todavia vivos —los sockets del pool de
  // fetch, la escritura pendiente a un stdout que es un pipe— y en Windows eso hace que
  // libuv aborte con `UV_HANDLE_CLOSING`. El proceso muere con codigo 127 en vez de 0, asi
  // que cualquier script que mire `$?` ve un fallo donde no lo hubo. Dejando que el bucle
  // se vacie solo, la salida se completa y el codigo llega intacto.
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      fail(`Error interno: ${err instanceof Error ? err.stack : String(err)}`);
      process.exitCode = EXIT.INTERNAL;
    });
}
