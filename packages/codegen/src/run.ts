/**
 * Regenerates everything derived from the spec.
 *
 *   bun run gen           # writes
 *   bun run gen --check   # writes nothing; exits 1 if anything would differ (this runs in CI)
 */
import { openapi } from "../../openapi/src/index.ts";
import { buildIR } from "./ir.ts";
import { genSdk } from "./gen-sdk.ts";
import { genCli } from "./gen-cli.ts";
import { genMcp } from "./gen-mcp.ts";
import type { WriteResult } from "./util.ts";

const check = process.argv.includes("--check");

const ops = buildIR(openapi);
console.log(
  `Spec v${openapi.info.version}: ${ops.length} operations, ` +
    `${Object.keys(openapi.components?.schemas ?? {}).length} schemas.`,
);

const results: WriteResult[] = [
  ...genSdk(ops, openapi, check),
  ...genCli(ops, openapi, check),
  ...genMcp(ops, check),
];

const changed = results.filter((r) => r.changed);

for (const r of results) {
  const rel = r.path.replace(/\\/g, "/").split("/packages/").pop();
  console.log(`  ${r.changed ? (check ? "DIFFERS" : "written") : "unchanged"}  packages/${rel}`);
}

if (check && changed.length) {
  console.error(
    `\n${changed.length} generated file(s) are out of date.\n` +
      `Run 'bun run gen' and commit the result.`,
  );
  process.exit(1);
}

console.log(
  check
    ? "\nEverything up to date."
    : `\nDone (${changed.length} file(s) updated).`,
);
