/**
 * Builds the CLI.
 *
 *   bun run build             # dist/truo.js — the npm package (Node 20+)
 *   bun run build --binaries  # + single-file binaries for brew/scoop/curl|sh
 *
 * Both outputs are **bundles**: the SDK and the spec travel inside. That is why
 * `@truocloud/cli` is published with zero dependencies, and why `npx @truocloud/cli`
 * downloads one file rather than a node_modules tree.
 */
import { mkdirSync, rmSync, existsSync, chmodSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENTRY = resolve(ROOT, "src/index.ts");
const DIST = resolve(ROOT, "dist");
const BIN = resolve(ROOT, "bin");

const withBinaries = process.argv.includes("--binaries");

/**
 * The six platforms that cover anyone installing via brew, scoop or `curl|sh`.
 * Compiling all six from a single machine is exactly what makes a runner per
 * operating system in CI unnecessary.
 */
const TARGETS = [
  { target: "bun-linux-x64", out: "truo-linux-x64" },
  { target: "bun-linux-arm64", out: "truo-linux-arm64" },
  { target: "bun-darwin-x64", out: "truo-darwin-x64" },
  { target: "bun-darwin-arm64", out: "truo-darwin-arm64" },
  { target: "bun-windows-x64", out: "truo-windows-x64.exe" },
  { target: "bun-linux-x64-musl", out: "truo-linux-x64-musl" },
];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

console.log("Bundle for npm (target: node)…");
const bundle = await Bun.build({
  entrypoints: [ENTRY],
  outdir: DIST,
  target: "node",
  format: "esm",
  minify: false, // A CLI that fails showing a minified stack helps nobody.
  naming: "truo.js",
});

if (!bundle.success) {
  for (const log of bundle.logs) console.error(log);
  process.exit(1);
}

const output = resolve(DIST, "truo.js");

// The shebang is prepended after the bundle rather than via the `banner` option: Bun
// emits its own preamble first, and a `#!` on line 2 is not a shebang — it is a syntax
// error the moment Node tries to load the file.
{
  const built = await Bun.file(output).text();
  const body = built.replace(/^#!.*\n/, "");
  await Bun.write(output, `#!/usr/bin/env node\n${body}`);
}

if (existsSync(output)) {
  try {
    chmodSync(output, 0o755);
  } catch {
    /* Windows does not apply the execute bit; npm fixes it at install time via the `bin` field. */
  }
}
const size = (await Bun.file(output).arrayBuffer()).byteLength;
console.log(`  dist/truo.js  ${(size / 1024).toFixed(0)} KB`);

if (!withBinaries) {
  console.log("\nDone. For the binaries: bun run build:binaries");
  process.exit(0);
}

rmSync(BIN, { recursive: true, force: true });
mkdirSync(BIN, { recursive: true });

for (const { target, out } of TARGETS) {
  const dest = resolve(BIN, out);
  console.log(`Compiling ${target}…`);
  const proc = Bun.spawnSync([
    "bun",
    "build",
    ENTRY,
    "--compile",
    `--target=${target}`,
    "--outfile",
    dest,
  ]);
  if (proc.exitCode !== 0) {
    console.error(new TextDecoder().decode(proc.stderr));
    process.exit(1);
  }
  const bytes = (await Bun.file(dest).arrayBuffer()).byteLength;
  console.log(`  bin/${out}  ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}

/**
 * Checksums.
 *
 * The binaries are downloaded via `curl | sh`, brew and scoop; all three formats
 * verify against a sha256. Computing them here rather than in the workflow lets
 * anyone reproduce the file and compare, without reading CI YAML.
 */
{
  const lines: string[] = [];
  for (const { out } of TARGETS) {
    const bytes = await Bun.file(resolve(BIN, out)).arrayBuffer();
    const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
    lines.push(`${digest}  ${out}`);
  }
  // `sha256sum` format: `<hash>  <file>`, so `sha256sum -c` can read it.
  await Bun.write(resolve(BIN, "SHA256SUMS"), lines.join("\n") + "\n");
  console.log("  bin/SHA256SUMS");
}

console.log(`\nDone: ${TARGETS.length} binaries in packages/cli/bin/.`);
