/**
 * Construye el CLI.
 *
 *   bun run build             # dist/truo.js — el paquete npm (Node 20+)
 *   bun run build --binaries  # + binarios single-file para brew/scoop/curl|sh
 *
 * Las dos salidas son **bundles**: el SDK y el spec viajan adentro. Por eso
 * `@truocloud/cli` se publica sin una sola dependencia, y por eso `npx @truocloud/cli`
 * baja un archivo y no un arbol de node_modules.
 */
import { mkdirSync, rmSync, existsSync, chmodSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ENTRY = resolve(ROOT, "src/index.ts");
const DIST = resolve(ROOT, "dist");
const BIN = resolve(ROOT, "bin");

const withBinaries = process.argv.includes("--binaries");

/**
 * Las seis plataformas que cubren a cualquiera que instale por brew, scoop o `curl|sh`.
 * Compilar los seis desde una sola maquina es justamente lo que hace innecesario un
 * runner por sistema operativo en CI.
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

console.log("Bundle para npm (target: node)…");
const bundle = await Bun.build({
  entrypoints: [ENTRY],
  outdir: DIST,
  target: "node",
  format: "esm",
  minify: false, // Un CLI que falla y muestra un stack minificado no ayuda a nadie.
  naming: "truo.js",
});

if (!bundle.success) {
  for (const log of bundle.logs) console.error(log);
  process.exit(1);
}

const output = resolve(DIST, "truo.js");

// El shebang se antepone despues del bundle y no con la opcion `banner`: Bun emite su
// propio preambulo primero, y un `#!` en la linea 2 no es un shebang — es un error de
// sintaxis en cuanto Node intenta cargar el archivo.
{
  const built = await Bun.file(output).text();
  const body = built.replace(/^#!.*\n/, "");
  await Bun.write(output, `#!/usr/bin/env node\n${body}`);
}

if (existsSync(output)) {
  try {
    chmodSync(output, 0o755);
  } catch {
    /* Windows no aplica el bit de ejecucion; npm lo arregla al instalar por el campo `bin`. */
  }
}
const size = (await Bun.file(output).arrayBuffer()).byteLength;
console.log(`  dist/truo.js  ${(size / 1024).toFixed(0)} KB`);

if (!withBinaries) {
  console.log("\nListo. Para los binarios: bun run build:binaries");
  process.exit(0);
}

rmSync(BIN, { recursive: true, force: true });
mkdirSync(BIN, { recursive: true });

for (const { target, out } of TARGETS) {
  const dest = resolve(BIN, out);
  console.log(`Compilando ${target}…`);
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
 * Los binarios se bajan por `curl | sh`, por brew y por scoop; los tres formatos
 * verifican contra un sha256. Calcularlos aca y no en el workflow deja que
 * cualquiera reproduzca el archivo y compare, sin leer YAML de CI.
 */
{
  const lines: string[] = [];
  for (const { out } of TARGETS) {
    const bytes = await Bun.file(resolve(BIN, out)).arrayBuffer();
    const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
    lines.push(`${digest}  ${out}`);
  }
  // Formato de `sha256sum`: `<hash>  <archivo>`, para que `sha256sum -c` lo lea.
  await Bun.write(resolve(BIN, "SHA256SUMS"), lines.join("\n") + "\n");
  console.log("  bin/SHA256SUMS");
}

console.log(`\nListo: ${TARGETS.length} binarios en packages/cli/bin/.`);
