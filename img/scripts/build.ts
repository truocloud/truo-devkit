/**
 * Builds the publishable packages.
 *
 * Deliberately NOT `scripts/build-npm.ts` from the repo root, for two reasons
 * that would both ship broken packages:
 *
 *  1. it bundles with no externals — fine for a self-contained SDK, fatal for a
 *     loader, which would end up with a copy of `next` or `vue` inside it;
 *  2. it emits ESM only, and `next.config.js` is still CommonJS in most real
 *     projects. A loader that cannot be `require`d is a loader nobody installs.
 *
 * Size budgets are enforced here rather than "monitored": a loader is code that
 * runs in every visitor's browser, and the moment it stops being obviously tiny
 * is the moment a maintainer reviewing our upstream PR closes the tab.
 */
import { gzipSync } from "node:zlib";
import { mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface Target {
  dir: string;
  entries: string[];
  /** gzipped ceiling per entry, in bytes */
  budget: Record<string, number>;
  external: string[];
}

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const TARGETS: Target[] = [
  {
    dir: "packages/url",
    entries: ["index", "sign"],
    // Measured, not guessed. The plan carried 1.8 KB for the core, written before
    // the decision to embed the full alias table — the 26 rows that let a caller
    // write `width` and `format` instead of `w` and `f`, which is most of what
    // "industry standard names" means here. That table is 408 B gzip of the
    // 2143 B measured, and it is the feature. The ceiling is the measurement plus
    // room for a handful of new parameters, not a round number someone liked.
    budget: { index: 2_400, sign: 900 },
    external: [],
  },
  {
    dir: "packages/next",
    entries: ["index", "loader"],
    budget: { index: 700, loader: 700 },
    external: ["@truocloud/img", "next"],
  },
  {
    dir: "packages/nuxt",
    entries: ["index"],
    budget: { index: 700 },
    external: ["@truocloud/img", "@nuxt/image", "ufo"],
  },
  {
    dir: "packages/angular",
    entries: ["index", "loader"],
    budget: { index: 700, loader: 700 },
    external: ["@truocloud/img", "@angular/common", "@angular/core"],
  },
];

const failures: string[] = [];

for (const target of TARGETS) {
  const dir = join(ROOT, target.dir);
  if (!existsSync(dir)) {
    console.log(`skip ${target.dir} (not present yet)`);
    continue;
  }
  const dist = join(dir, "dist");
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  // Declarations first: tsc is the only thing that produces them, and if it
  // fails there is no point bundling.
  const tsc = Bun.spawnSync(
    ["bunx", "tsc", "--project", join(dir, "tsconfig.build.json")],
    { cwd: dir, stdout: "inherit", stderr: "inherit" },
  );
  if (tsc.exitCode !== 0) {
    failures.push(`${target.dir}: tsc failed`);
    continue;
  }

  for (const entry of target.entries) {
    const source = join(dir, "src", `${entry}.ts`);
    if (!existsSync(source)) {
      failures.push(`${target.dir}: src/${entry}.ts is missing`);
      continue;
    }

    for (const format of ["esm", "cjs"] as const) {
      const out = await Bun.build({
        entrypoints: [source],
        outdir: dist,
        target: "node",
        format,
        external: target.external,
        minify: false,
        naming: `[dir]/[name].${format === "cjs" ? "cjs" : "js"}`,
      });
      if (!out.success) {
        failures.push(`${target.dir}: ${format} build of ${entry} failed: ${out.logs.join("\n")}`);
      }
    }

    // The budget measures a MINIFIED build, not the published file. We publish
    // unminified on purpose (the consumer's bundler minifies, and a readable
    // stack trace is worth more than bytes on disk), so the published size says
    // nothing about what a visitor downloads. This does.
    const measured = await Bun.build({
      entrypoints: [source],
      target: "browser",
      format: "esm",
      external: target.external,
      minify: true,
    });
    if (measured.success && measured.outputs[0]) {
      const gz = gzipSync(await measured.outputs[0].text()).byteLength;
      const limit = target.budget[entry] ?? Infinity;
      const verdict = gz <= limit ? "ok" : "OVER BUDGET";
      console.log(`${target.dir}/${entry}  ${gz} B min+gzip (limit ${limit})  ${verdict}`);
      if (gz > limit) {
        failures.push(`${target.dir}/${entry} is ${gz} B min+gzip, over the ${limit} B budget`);
      }
    }
  }

  // The fixture travels with the core package so the PHP builder's CI can verify
  // against the same contract without vendoring it.
  if (target.dir === "packages/url") {
    await mkdir(join(dir, "fixtures"), { recursive: true });
    await Bun.write(
      join(dir, "fixtures", "urls.json"),
      await Bun.file(join(ROOT, "fixtures", "urls.json")).text(),
    );
  }

  const produced = await readdir(dist);
  // The guard exists because it almost happened in the other release pipeline:
  // without dist, npm publishes a package containing only package.json, exit 0.
  if (!produced.some((f) => f.endsWith(".js"))) {
    failures.push(`${target.dir}: dist/ has no .js — publishing this would ship an empty package`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nbuild ok");
