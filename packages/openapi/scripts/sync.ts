/**
 * Syncs the local copy of the spec with the source of truth.
 *
 *   bun run sync:spec                    # from the live API (api.truo.cloud)
 *   bun run sync:spec --from ../api      # from a local checkout of the API (no deploy)
 *   bun run sync:spec --check            # writes nothing; exits 1 if there is a difference
 *
 * `--check` is the one that matters: it runs in CI and turns "the devkit went stale" from
 * something discovered when a client is missing an endpoint into a red build. Without it,
 * this package is a copy that ages in silence: a duplicated spec that nothing compares
 * with its original always ends up diverging.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEST_JSON = resolve(HERE, "../openapi/v1.json");
const LIVE_URL = "https://api.truo.cloud/v1/openapi.json";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const check = process.argv.includes("--check");
const from = arg("from");

/**
 * Always re-serialized with the same format instead of storing the raw body. A whitespace
 * change from the upstream generator must not read as a contract change: the diff we want
 * to read in the PR is the API's, not the pretty-printer's.
 */
function canonical(doc: unknown): string {
  return JSON.stringify(doc, null, 2) + "\n";
}

/**
 * Only the JSON is stored. The YAML upstream exists for reading by eye and **the API
 * does not serve it**, so a copy here would have nothing to compare against: it would be
 * exactly the silently-drifting file this gate exists to prevent.
 */
async function fetchSpec(): Promise<{ json: unknown; origin: string }> {
  if (from) {
    const base = resolve(process.cwd(), from);
    const j = resolve(base, "apps/public-api/openapi/v1.json");
    if (!existsSync(j)) {
      console.error(`${j} does not exist. --from must point at the root of the API repo.`);
      process.exit(2);
    }
    return { json: JSON.parse(readFileSync(j, "utf8")), origin: j };
  }
  const res = await fetch(LIVE_URL, { headers: { accept: "application/json" } });
  if (!res.ok) {
    console.error(`GET ${LIVE_URL} -> ${res.status}`);
    process.exit(2);
  }
  return { json: await res.json(), origin: LIVE_URL };
}

const { json, origin } = await fetchSpec();
const next = canonical(json);
const current = existsSync(DEST_JSON) ? readFileSync(DEST_JSON, "utf8") : "";

const version = (json as { info?: { version?: string } }).info?.version ?? "?";
const paths = Object.keys((json as { paths?: object }).paths ?? {}).length;

if (next === current) {
  console.log(`Spec up to date (v${version}, ${paths} paths) — source: ${origin}`);
  process.exit(0);
}

if (check) {
  console.error(
    `The devkit's spec differs from ${origin}.\n` +
      `Run 'bun run sync:spec' and commit the result; the diff is the contract change.`,
  );
  process.exit(1);
}

writeFileSync(DEST_JSON, next, "utf8");
console.log(
  `Spec updated (v${version}, ${paths} paths) from ${origin}.\n` +
    `Next: 'bun run gen' to regenerate the SDK and CLI.`,
);
