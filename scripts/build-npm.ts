/**
 * Prepara los tres paquetes publicables.
 *
 *   bun run build:npm
 *
 * **Por que hay build.** Los fuentes importan con extension `.ts` a proposito:
 * asi el repo se clona y se corre sin instalar nada. Pero Node no carga `.ts`, y
 * publicar los fuentes tal cual dejaria un paquete que solo funciona en Bun. Lo
 * que se publica es JavaScript con sus `.d.ts` al lado.
 *
 * Cada paquete sale como **un solo archivo JS sin dependencias**: el `import` del
 * spec JSON queda inlineado, y `npm i @truocloud/sdk` no baja un arbol de
 * `node_modules`.
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
    throw new Error(`fallo: ${cmd.join(" ")} (en ${cwd})`);
  }
}

for (const target of TARGETS) {
  const dir = resolve(ROOT, target.dir);
  const dist = resolve(dir, "dist");
  rmSync(dist, { recursive: true, force: true });

  console.log(`${target.name}`);

  // 1. Tipos. Va primero: si el paquete no typechequea, no tiene sentido
  //    bundlearlo — `bun build` no valida tipos y publicaria algo roto.
  await run(
    ["bunx", "tsc", "--project", "tsconfig.build.json"],
    dir,
  );

  // 2. JavaScript. Un solo archivo, sin externals: no hay dependencias que
  //    dejar afuera, y el JSON del spec queda adentro.
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
    throw new Error(`${target.name}: falta ${existsSync(js) ? "index.d.ts" : "index.js"} en dist/`);
  }
  const size = (await Bun.file(js).arrayBuffer()).byteLength;
  console.log(`  dist/index.js   ${(size / 1024).toFixed(0)} KB`);
  console.log(`  dist/index.d.ts + arbol de tipos`);
}

// El CLI tiene su propio script: compila ademas los binarios single-file.
console.log("@truocloud/cli");
await run(["bun", "scripts/build.ts"], resolve(ROOT, "packages/cli"));

console.log("\nListo. Los tres paquetes tienen dist/.");
