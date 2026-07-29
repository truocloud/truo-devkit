/**
 * Fija la misma version en los tres paquetes publicables.
 *
 *   bun scripts/set-version.ts 0.2.0
 *   bun scripts/set-version.ts --check 0.2.0   # no escribe, solo verifica
 *
 * **Una sola version para los tres.** `@truocloud/sdk` 0.3.1 y `@truocloud/cli`
 * 0.2.7 obligarian a mantener una tabla de compatibilidad entre ellos, cuando en
 * realidad los tres salen del mismo commit del mismo spec. Un `truo --version`
 * que coincide con el `@truocloud/sdk` instalado hace que un reporte de bug diga
 * algo.
 *
 * La version del **contrato** es otra cosa y no se toca acá: vive en el
 * `info.version` del OpenAPI y la manda la API. Tampoco se puede reusar como
 * version de npm: dentro de `v1` el spec gana endpoints todo el tiempo sin que
 * `info.version` se mueva, y npm rechaza republicar la misma version. Por eso
 * `@truocloud/openapi` lleva la version del devkit y **exporta** la del
 * contrato (`API_VERSION`), que es la que le importa a quien lo consume.
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
  console.error("Uso: bun scripts/set-version.ts [--check] <version>");
  process.exit(2);
}

// Se acepta `v0.2.0` porque es la forma del tag de git, que es de donde sale en
// CI; guardar la `v` en el package.json haria que npm rechace la publicacion.
const version = raw.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`"${version}" no es semver.`);
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

  // Reemplazo dirigido en vez de reescribir el JSON: `JSON.stringify` reordena
  // nada pero sí normaliza el formato, y un diff de release que toca cuarenta
  // lineas por un cambio de version esconde lo que de verdad cambio.
  const next = text.replace(/("version":\s*)"[^"]*"/, `$1"${version}"`);
  if (next === text && pkg.version !== version) {
    console.error(`${pkg.name}: no se encontro el campo "version".`);
    process.exit(1);
  }
  writeFileSync(path, next, "utf8");
  console.log(`${pkg.name}  →  ${version}`);
}

if (check) {
  if (mismatched > 0) {
    console.error(`\n${mismatched} paquete(s) fuera de sincronia. Corre: bun scripts/set-version.ts ${version}`);
    process.exit(1);
  }
  console.log(`Los ${PUBLISHABLE.length} paquetes estan en ${version}.`);
}
