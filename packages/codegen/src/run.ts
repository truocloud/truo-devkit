/**
 * Regenera todo lo derivado del spec.
 *
 *   bun run gen           # escribe
 *   bun run gen --check   # no escribe; sale 1 si algo quedaria distinto (esto corre en CI)
 */
import { openapi } from "../../openapi/src/index.ts";
import { buildIR } from "./ir.ts";
import { genSdk } from "./gen-sdk.ts";
import { genCli } from "./gen-cli.ts";
import type { WriteResult } from "./util.ts";

const check = process.argv.includes("--check");

const ops = buildIR(openapi);
console.log(
  `Spec v${openapi.info.version}: ${ops.length} operaciones, ` +
    `${Object.keys(openapi.components?.schemas ?? {}).length} schemas.`,
);

const results: WriteResult[] = [...genSdk(ops, openapi, check), ...genCli(ops, openapi, check)];

const changed = results.filter((r) => r.changed);

for (const r of results) {
  const rel = r.path.replace(/\\/g, "/").split("/packages/").pop();
  console.log(`  ${r.changed ? (check ? "DIFIERE" : "escrito") : "sin cambios"}  packages/${rel}`);
}

if (check && changed.length) {
  console.error(
    `\n${changed.length} archivo(s) generado(s) estan desactualizados.\n` +
      `Corre 'bun run gen' y commitea el resultado.`,
  );
  process.exit(1);
}

console.log(
  check
    ? "\nTodo al dia."
    : `\nListo (${changed.length} archivo(s) actualizado(s)).`,
);
