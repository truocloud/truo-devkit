/**
 * Generates `packages/url/src/names.ts` from the shared fixture.
 *
 * The alias table is the service's, not ours: it is what makes `width=800` and
 * `format=auto` work without the caller knowing what runs underneath. Hand-copying
 * it here would be a second copy of a ~90-entry map that nobody would notice going
 * out of sync — the failure mode is not an error, it is a parameter silently
 * ignored and a full-size image billed as a thumbnail.
 *
 * Only the entries where the public name differs from the canonical one are
 * emitted: an identity mapping costs bytes in every browser bundle and says
 * nothing.
 *
 *   bun run gen          # regenerate
 *   bun run gen:check    # fail if stale (CI)
 */
const FIXTURE = new URL("../fixtures/urls.json", import.meta.url);
const TARGET = new URL("../packages/url/src/names.ts", import.meta.url);
const check = process.argv.includes("--check");

const fixture = (await Bun.file(FIXTURE).json()) as { canonical_names: Record<string, string> };

const aliases = Object.entries(fixture.canonical_names)
  .filter(([alias, canonical]) => alias !== canonical)
  .sort(([a], [b]) => (a < b ? -1 : 1));

const canonicals = [...new Set(Object.values(fixture.canonical_names))].sort();

const body = `/**
 * Public parameter name -> canonical wire name.
 *
 * GENERATED from the shared fixture by \`bun run gen\`. Do not edit.
 *
 * Only the aliases are here: a name that already is its canonical form maps to
 * itself and does not need a row. Lookup normalises first (lowercase, no \`-\`
 * or \`_\`), which is what makes \`withoutEnlargement\`, \`without_enlargement\`
 * and \`WITHOUTENLARGEMENT\` the same parameter.
 */
const ALIASES: Record<string, string> = ${JSON.stringify(Object.fromEntries(aliases), null, 2)};

/** Every canonical name the service understands. */
export const CANONICAL_NAMES: readonly string[] = ${JSON.stringify(canonicals)};

const CANONICAL = new Set(CANONICAL_NAMES);

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[-_]/g, "");
}

/**
 * \`null\` when we do not know the name. The caller still emits it, lowercased:
 * the service drops unknown parameters in silence (real HTML carries \`?ver=6.4\`
 * glued to image URLs), and a builder that threw here would break pages over
 * decoration.
 */
export function canonicalName(name: string): string | null {
  const key = normalize(name);
  return ALIASES[key] ?? (CANONICAL.has(key) ? key : null);
}
`;

const current = await Bun.file(TARGET).text().catch(() => "");
if (current === body) {
  console.log("[names] up to date");
  process.exit(0);
}
if (check) {
  console.error("[names] packages/url/src/names.ts is stale — run `bun run gen`");
  process.exit(1);
}
await Bun.write(TARGET, body);
console.log(`[names] ${aliases.length} aliases, ${canonicals.length} canonical names`);
