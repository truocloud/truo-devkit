/**
 * Sincroniza la copia local del spec con la fuente de verdad.
 *
 *   bun run sync:spec                    # desde la API en vivo (api.truo.cloud)
 *   bun run sync:spec --from ../api      # desde un checkout local de la API (sin deploy)
 *   bun run sync:spec --check            # no escribe; sale 1 si hay diferencia
 *
 * El `--check` es el que importa: corre en CI y convierte "el devkit quedo viejo" de algo
 * que se descubre cuando a un cliente le falta un endpoint, en un build rojo. Sin el, este
 * paquete es una copia que envejece en silencio: una spec duplicada que nada compara con su
 * original siempre termina divergiendo.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEST_JSON = resolve(HERE, "../openapi/v1.json");
const LIVE_URL = "https://api.truo.cloud/v1/openapi.json";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const check = process.argv.includes("--check");
const from = arg("from");

/**
 * Se re-serializa siempre con el mismo formato en vez de guardar el cuerpo crudo. Un
 * cambio de whitespace del generador upstream no debe verse como un cambio de contrato:
 * el diff que queremos leer en el PR es el de la API, no el del pretty-printer.
 */
function canonical(doc: unknown): string {
  return JSON.stringify(doc, null, 2) + "\n";
}

/**
 * Solo se guarda el JSON. El YAML del panel existe para leerlo a ojo y **la API no lo
 * sirve**, asi que una copia aca no tendria contra que compararse: seria justamente el
 * archivo que deriva en silencio que este gate existe para evitar.
 */
async function fetchSpec(): Promise<{ json: unknown; origin: string }> {
  if (from) {
    const base = resolve(process.cwd(), from);
    const j = resolve(base, "apps/public-api/openapi/v1.json");
    if (!existsSync(j)) {
      console.error(`No existe ${j}. --from debe apuntar a la raiz del repo de la API.`);
      process.exit(2);
    }
    return { json: JSON.parse(readFileSync(j, "utf8")), origin: j };
  }
  const res = await fetch(LIVE_URL, { headers: { accept: "application/json" } });
  if (!res.ok) {
    console.error(`GET ${LIVE_URL} -> ${res.status}`);
    process.exit(2);
  }
  return { json: await res.json(), origin: LIVE_URL };
}

const { json, origin } = await fetchSpec();
const next = canonical(json);
const current = existsSync(DEST_JSON) ? readFileSync(DEST_JSON, "utf8") : "";

const version = (json as { info?: { version?: string } }).info?.version ?? "?";
const paths = Object.keys((json as { paths?: object }).paths ?? {}).length;

if (next === current) {
  console.log(`Spec al dia (v${version}, ${paths} paths) — fuente: ${origin}`);
  process.exit(0);
}

if (check) {
  console.error(
    `El spec del devkit difiere de ${origin}.\n` +
      `Corre 'bun run sync:spec' y commitea el resultado; el diff es el cambio de contrato.`,
  );
  process.exit(1);
}

writeFileSync(DEST_JSON, next, "utf8");
console.log(
  `Spec actualizado (v${version}, ${paths} paths) desde ${origin}.\n` +
    `Siguiente: 'bun run gen' para regenerar SDK y CLI.`,
);
