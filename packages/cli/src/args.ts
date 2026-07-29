/**
 * Parser de argumentos.
 *
 * Se escribe a mano en vez de usar `commander` porque el arbol de comandos ya viene
 * generado del OpenAPI: no hay cadenas `.command().option().action()` que escribir, solo
 * un dispatcher sobre datos. Una libreria imperativa aportaria API para construir a mano
 * justo lo que no construimos a mano, a cambio de una dependencia en un binario que
 * queremos compilar single-file.
 */
import { CliError, EXIT } from "./exit.ts";

export interface ParsedArgs {
  /** Segmentos antes del primer `--flag`: `["vps","power","svc_1","stop"]`. */
  words: string[];
  /** Valores por nombre de flag, sin `--`. Repetir una flag acumula un array. */
  flags: Map<string, string | boolean | string[]>;
  /** Lo que va despues de `--`, intacto (lo usa `truo vps ssh -- -p 2222`). */
  passthrough: string[];
}

/** Alias de una letra. Deliberadamente pocos: los que se tipean cien veces por dia. */
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
        // `--no-wait` apaga `wait`. Es la unica forma de negar un booleano que ya viene
        // en true por defecto sin inventar `--wait=false`.
        name = name.slice(3);
        value = false;
      } else {
        const next = argv[i + 1];
        // Un valor que empieza con `-` es ambiguo: puede ser el valor (`--query -1`) o la
        // siguiente flag. Se resuelve a favor de "booleano", que es lo que casi siempre
        // es; para el otro caso esta `--flag=-1`.
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
      // `-abc` no se expande a tres flags: en este CLI ninguna combinacion tiene sentido
      // y aceptarlo solo generaria errores dificiles de leer.
      const letter = token.slice(1);
      const name = SHORT[letter];
      if (!name) {
        throw new CliError(`Flag desconocida: -${letter}`, EXIT.USAGE, "Corre 'truo --help'.");
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
