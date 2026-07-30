/**
 * Pins the same version across the three publishable packages.
 *
 *   bun scripts/set-version.ts 0.2.0
 *   bun scripts/set-version.ts --check 0.2.0   # writes nothing, only verifies
 *
 * **One version for all three.** A `@truocloud/sdk` 0.3.1 and a `@truocloud/cli`
 * 0.2.7 would force maintaining a compatibility table between them, when in
 * reality all three come out of the same commit of the same spec. A
 * `truo --version` that matches the installed `@truocloud/sdk` makes a bug
 * report mean something.
 *
 * The **contract** version is a different thing and is not touched here: it
 * lives in the OpenAPI `info.version` and the API owns it. It cannot be reused
 * as the npm version either: within `v1` the spec gains endpoints all the time
 * without `info.version` moving, and npm rejects republishing the same version.
 * That is why `@truocloud/openapi` carries the devkit version and **exports**
 * the contract's (`API_VERSION`), which is the one its consumers care about.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

export const PUBLISHABLE = [
  "packages/openapi",
  "packages/sdk",
  "packages/cli",
] as const;

const args = process.argv.slice(2);
const check = args.includes("--check");
const raw = args.find((a) => !a.startsWith("--"));

if (!raw) {
  console.error("Usage: bun scripts/set-version.ts [--check] <version>");
  process.exit(2);
}

// `v0.2.0` is accepted because it is the shape of the git tag, which is where it
// comes from in CI; keeping the `v` in package.json would make npm reject the publish.
const version = raw.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`"${version}" is not semver.`);
  process.exit(2);
}

let mismatched = 0;
for (const dir of PUBLISHABLE) {
  const path = resolve(ROOT, dir, "package.json");
  const text = readFileSync(path, "utf8");
  const pkg = JSON.parse(text) as { name: string; version: string };

  if (check) {
    if (pkg.version !== version) {
      console.error(`${pkg.name}: ${pkg.version} ≠ ${version}`);
      mismatched++;
    }
    continue;
  }

  // Targeted replacement instead of rewriting the JSON: `JSON.stringify` reorders
  // nothing but does normalize the formatting, and a release diff touching forty
  // lines for a version bump hides what actually changed.
  const next = text.replace(/("version":\s*)"[^"]*"/, `$1"${version}"`);
  if (next === text && pkg.version !== version) {
    console.error(`${pkg.name}: could not find the "version" field.`);
    process.exit(1);
  }
  writeFileSync(path, next, "utf8");
  console.log(`${pkg.name}  →  ${version}`);
}

if (check) {
  if (mismatched > 0) {
    console.error(`\n${mismatched} package(s) out of sync. Run: bun scripts/set-version.ts ${version}`);
    process.exit(1);
  }
  console.log(`All ${PUBLISHABLE.length} packages are at ${version}.`);
}
