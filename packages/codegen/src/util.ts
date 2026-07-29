import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const BANNER = `// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVO GENERADO — no editar a mano.
//
// Sale de packages/openapi/openapi/v1.json a traves de packages/codegen.
// Para cambiarlo: cambia el handler en la API (los schemas Zod son la fuente de
// verdad), regenera el spec alla, 'bun run sync:spec' aca, y 'bun run gen'.
// ─────────────────────────────────────────────────────────────────────────────
`;

/** `dns.zones.records` → `DnsZonesRecords`. Tambien parte en `_` y `-`. */
export function pascal(input: string): string {
  return input
    .split(/[.\-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/** `set_password` → `setPassword`. Deja intacto lo que ya es camelCase. */
export function camel(input: string): string {
  const p = pascal(input);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** Un identificador JS valido no necesita comillas como clave de objeto. */
export function isIdent(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

export function quoteKey(name: string): string {
  return isIdent(name) ? name : JSON.stringify(name);
}

/** Comentario JSDoc a partir de un texto libre; devuelve "" si no hay nada que decir. */
export function jsdoc(text: string | undefined, indent = ""): string {
  if (!text) return "";
  const lines = text.trim().split("\n");
  if (lines.length === 1 && lines[0]!.length < 100) {
    return `${indent}/** ${lines[0]!.replace(/\*\//g, "*\\/")} */\n`;
  }
  const body = lines.map((l) => `${indent} * ${l.replace(/\*\//g, "*\\/")}`).join("\n");
  return `${indent}/**\n${body}\n${indent} */\n`;
}

export interface WriteResult {
  path: string;
  changed: boolean;
}

/**
 * Escribe solo si cambio, y en modo `--check` no escribe nada: informa.
 *
 * Los dos comportamientos son el mismo gate visto desde dos lados. En local, no tocar
 * archivos identicos deja `git status` limpio y hace obvio que la generacion es
 * deterministica. En CI, `--check` falla si alguien edito a mano un archivo generado o
 * si actualizo el spec sin regenerar — que es la unica forma de que el SDK publicado y
 * el contrato publicado se separen sin que nadie se entere.
 */
export function writeGenerated(path: string, content: string, check: boolean): WriteResult {
  const next = content.endsWith("\n") ? content : content + "\n";
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  const changed = current !== next;
  if (changed && !check) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, next, "utf8");
  }
  return { path, changed };
}
