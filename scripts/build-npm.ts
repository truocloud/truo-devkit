/**
 * Prepares the three publishable packages.
 *
 *   bun run build:npm
 *
 * **Why there is a build.** The sources import with the `.ts` extension on
 * purpose: that way the repo clones and runs without installing anything. But
 * Node does not load `.ts`, and publishing the sources as-is would leave a
 * package that only works on Bun. What gets published is JavaScript with its
 * `.d.ts` next to it.
 *
 * Each package comes out as **a single dependency-free JS file**: the spec JSON
 * import gets inlined, and `npm i @truocloud/sdk` does not pull down a
 * `node_modules` tree.
 */
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

interface Target {
  name: string;
  dir: string;
  entry: string;
}

const TARGETS: Target[] = [
  { name: "@truocloud/openapi", dir: "packages/openapi", entry: "src/index.ts" },
  { name: "@truocloud/sdk", dir: "packages/sdk", entry: "src/index.ts" },
];

async function run(cmd: string[], cwd: string): Promise<void> {
  const proc = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  if (proc.exitCode !== 0) {
    console.error(new TextDecoder().decode(proc.stdout));
    console.error(new TextDecoder().decode(proc.stderr));
    throw new Error(`failed: ${cmd.join(" ")} (in ${cwd})`);
  }
}

for (const target of TARGETS) {
  const dir = resolve(ROOT, target.dir);
  const dist = resolve(dir, "dist");
  rmSync(dist, { recursive: true, force: true });

  console.log(`${target.name}`);

  // 1. Types. Goes first: if the package does not typecheck, there is no point
  //    bundling it — `bun build` does not validate types and would publish something broken.
  await run(
    ["bunx", "tsc", "--project", "tsconfig.build.json"],
    dir,
  );

  // 2. JavaScript. One file, no externals: there are no dependencies to leave
  //    out, and the spec JSON goes inside.
  const build = await Bun.build({
    entrypoints: [resolve(dir, target.entry)],
    outdir: dist,
    target: "node",
    format: "esm",
    minify: false,
    naming: "index.js",
  });
  if (!build.success) {
    for (const log of build.logs) console.error(log);
    process.exit(1);
  }

  const js = resolve(dist, "index.js");
  const dts = resolve(dist, "index.d.ts");
  if (!existsSync(js) || !existsSync(dts)) {
    throw new Error(`${target.name}: missing ${existsSync(js) ? "index.d.ts" : "index.js"} in dist/`);
  }
  const size = (await Bun.file(js).arrayBuffer()).byteLength;
  console.log(`  dist/index.js   ${(size / 1024).toFixed(0)} KB`);
  console.log(`  dist/index.d.ts + type tree`);
}

// The CLI has its own script: it additionally compiles the single-file binaries.
console.log("@truocloud/cli");
await run(["bun", "scripts/build.ts"], resolve(ROOT, "packages/cli"));

console.log("\nDone. All three packages have dist/.");
