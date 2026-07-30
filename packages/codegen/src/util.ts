import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const BANNER = `// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//
// It comes from packages/openapi/openapi/v1.json via packages/codegen.
// To change it: change the handler in the API (the Zod schemas are the source
// of truth), regenerate the spec there, 'bun run sync:spec' here, then 'bun run gen'.
// ─────────────────────────────────────────────────────────────────────────────
`;

/** `dns.zones.records` → `DnsZonesRecords`. Also splits on `_` and `-`. */
export function pascal(input: string): string {
  return input
    .split(/[.\-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/** `set_password` → `setPassword`. Leaves anything already camelCase intact. */
export function camel(input: string): string {
  const p = pascal(input);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** A valid JS identifier needs no quotes as an object key. */
export function isIdent(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

export function quoteKey(name: string): string {
  return isIdent(name) ? name : JSON.stringify(name);
}

/** JSDoc comment from free text; returns "" if there is nothing to say. */
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
 * Writes only if it changed, and in `--check` mode writes nothing: it reports.
 *
 * The two behaviors are the same gate seen from two sides. Locally, not touching
 * identical files keeps `git status` clean and makes it obvious that generation is
 * deterministic. In CI, `--check` fails if someone hand-edited a generated file or
 * updated the spec without regenerating — which is the only way for the published SDK
 * and the published contract to drift apart with nobody noticing.
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
