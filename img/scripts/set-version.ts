/**
 * Writes one version into the four package.json files.
 *
 * The tag is the single source of the version — the release workflow runs this
 * before publishing — so there is no way to tag `img-v0.2.0` and publish `0.1.9`
 * because of a forgotten commit.
 *
 * The loaders depend on the core with an **exact** version, and that dependency
 * is rewritten here too. An `^` range would let a loader published today resolve
 * against a core published next month whose URL contract had moved: the loader
 * would keep working right up until it silently started emitting URLs the
 * service no longer serves.
 *
 *   bun scripts/set-version.ts 0.1.0
 *   bun scripts/set-version.ts --check   # fail if they disagree
 */
const PACKAGES = ["packages/url", "packages/next", "packages/nuxt", "packages/angular"];
const CORE = "@truocloud/img";

const check = process.argv.includes("--check");
const version = process.argv.slice(2).find((a) => !a.startsWith("--"));

if (!check && !version) {
  console.error("usage: bun scripts/set-version.ts <version> | --check");
  process.exit(1);
}
if (version && !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`[version] "${version}" is not a semver version`);
  process.exit(1);
}

const problems: string[] = [];

for (const dir of PACKAGES) {
  const path = new URL(`../${dir}/package.json`, import.meta.url);
  const file = Bun.file(path);
  const pkg = (await file.json()) as {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
  };

  if (check) {
    const target = version ?? (await Bun.file(new URL("../packages/url/package.json", import.meta.url)).json() as { version: string }).version;
    if (pkg.version !== target) problems.push(`${pkg.name} is ${pkg.version}, expected ${target}`);
    if (pkg.dependencies?.[CORE] && pkg.dependencies[CORE] !== target) {
      problems.push(`${pkg.name} depends on ${CORE}@${pkg.dependencies[CORE]}, expected ${target}`);
    }
    continue;
  }

  pkg.version = version!;
  if (pkg.dependencies?.[CORE]) pkg.dependencies[CORE] = version!;
  await Bun.write(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`[version] ${pkg.name} -> ${version}`);
}

if (problems.length > 0) {
  for (const p of problems) console.error(`[version] ${p}`);
  process.exit(1);
}
if (check) console.log("[version] the four packages agree");
