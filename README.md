# TruoCloud devkit

Herramientas para operar [TruoCloud](https://www.truocloud.com) desde código, desde la terminal y —pronto— desde un agente de IA. Todo sale de un solo contrato: el OpenAPI de [`api.truo.cloud/v1`](https://api.truo.cloud/v1/openapi.json).

| Paquete | Qué es | Estado |
|---|---|---|
| [`@truocloud/openapi`](packages/openapi) | La especificación OpenAPI, versionada | beta |
| [`@truocloud/sdk`](packages/sdk) | Cliente TypeScript. **Cero dependencias** | beta |
| [`@truocloud/cli`](packages/cli) | El comando `truo` | beta |
| [`docs/`](docs) | [docs.truo.cloud](https://docs.truo.cloud) — Astro Starlight + Scalar | beta |
| `@truocloud/mcp` | Servidor MCP para agentes | *(no existe todavía)* |

---

## Instalación

```bash
# CLI — elegí uno
npm install -g @truocloud/cli
brew install truocloud/tap/truo
scoop bucket add truocloud https://github.com/truocloud/scoop-bucket && scoop install truo
curl -fsSL https://raw.githubusercontent.com/truocloud/truo-devkit/main/install.sh | sh

truo auth login

# SDK
npm install @truocloud/sdk
```

`truo auth login` abre un login en el navegador (device flow, RFC 8628): muestra un código, lo aprobás desde cualquier navegador —puede ser el del teléfono— y el CLI crea **su propia API key**, acotada y revocable por separado. Nadie copia y pega una key. En CI: `--token` o `TRUO_TOKEN`.

Los binarios se publican con su `SHA256SUMS`, y brew, scoop y `install.sh` los verifican. Los paquetes de npm se publican con [provenance](https://docs.npmjs.com/generating-provenance-statements): se puede comprobar que el tarball salió de este repo y de este workflow.

## En treinta segundos

```bash
truo services list                       # qué tengo
truo vps list -o json | jq '.[].hostname'
truo vps power svc_10432 stop            # espera a que termine, sola
truo dns record list ejemplo.com
```

```ts
import { TruoClient } from "@truocloud/sdk";

const truo = new TruoClient();                    // lee TRUO_TOKEN

for await (const svc of truo.services.listAll({ family: "vps" })) {
  console.log(svc.id, svc.name);
}

const op = await truo.vps.power("svc_10432", { action: "stop" });
await truo.operations.wait(op.id);
```

---

## Cómo está construido

```
openapi/v1.json  ──┬─→  sdk/generated/types.ts        tipos del contrato
                   ├─→  sdk/generated/operations.ts   metadatos (scope, peligro, async)
                   ├─→  sdk/generated/resources.ts    el árbol tipado del cliente
                   └─→  cli/generated/commands.ts     el árbol de comandos
```

**Ningún eslabón se escribe a mano.** El spec sale de los schemas Zod de los handlers de la API; de ahí salen los tipos, los métodos del SDK y los comandos del CLI. Una operación nueva que declare `x-truo-cli` aparece en el CLI en el siguiente `bun run gen`, con su ayuda, sus argumentos y sus valores válidos.

Lo que sí está escrito a mano es lo que un generador no debería tocar nunca: el transporte del SDK (reintentos, idempotencia, errores, cursor) y el dispatcher del CLI. Ahí un bug cuesta caro y no queremos que se reescriba solo cada vez que la API crece.

### Sin dependencias, a propósito

Ni el SDK ni el CLI tienen dependencias en runtime, y el codegen tampoco tiene dependencias de build. Tres consecuencias concretas:

- `npm i @truocloud/sdk` no agrega nada al árbol de la aplicación del cliente.
- El CLI se compila a un binario de un solo archivo (`bun build --compile`) para brew, scoop y `curl | sh`.
- Cualquiera puede clonar este repo, correr `bun run gen` y obtener exactamente los mismos artefactos, sin instalar nada.

El costo es un emisor de tipos propio (`packages/codegen/src/ts-types.ts`) en vez de `openapi-typescript`. Se paga porque el subconjunto de JSON Schema que Zod produce es chico y conocido, y porque cuando el emisor encuentra algo que no soporta **falla el build** en vez de emitir `any` en silencio.

---

## Desarrollo

```bash
bun install
bun run sync:spec          # baja el spec de api.truo.cloud
bun run gen                # regenera SDK + CLI
bun test                   # 52 tests, sin red
bun run gen:check          # falla si lo generado quedó viejo (esto corre en CI)

bun packages/cli/src/index.ts vps list   # el CLI desde el fuente
bun run build                            # dist/truo.js (npm)
bun run build --binaries                 # 6 binarios single-file + SHA256SUMS
bun run build:npm                        # los tres paquetes listos para publicar
```

### Publicar

Un tag `vX.Y.Z` dispara todo. **El tag es la única fuente de la versión**: el workflow la escribe en los tres `package.json` antes de construir, así que no se puede taggear `v0.3.0` y publicar `0.2.9` por un commit olvidado.

```bash
git tag v0.2.0 && git push origin v0.2.0
```

De ahí sale: los tres paquetes en npm con provenance, un release de GitHub con los seis binarios y el spec, y la fórmula de brew y el manifiesto de scoop actualizados. Las mismas puertas que en cada push (`sync:spec --check`, `gen:check`, `typecheck`, tests) corren también acá — un release es justo el momento en que un spec desincronizado se convierte en un paquete publicado que miente sobre la API.

Para ensayar sin publicar: *Actions → Release → Run workflow*.

Los tres paquetes comparten versión (`bun run version:set 0.2.0`). Versiones distintas obligarían a mantener una tabla de compatibilidad entre cosas que salen del mismo commit del mismo spec.

### Documentación

`docs/` vive **fuera** del workspace `packages/*`: el devkit se clona y se corre sin instalar nada, y Astro es un árbol de dependencias que no tiene por qué estar en el medio de eso. Se instala solo si vas a tocar la documentación.

```bash
cd docs && bun install
bun run dev        # genera del spec y levanta Astro
bun run generate   # solo lo generado, para inspeccionarlo
```

De `openapi/v1.json` salen: `public/openapi.json` (lo que consume Scalar en `/reference`), `public/llms.txt` y `llms-full.txt` (el catálogo para agentes), y una página de referencia por familia donde **cada operación aparece en sus cuatro formas** — curl, CLI, SDK y MCP — derivadas todas del mismo `operationId`. Esa paridad automática *es* la prueba del "API-first"; escritas a mano, tres de las cuatro quedarían viejas en el primer endpoint nuevo.

Se despliega a GitHub Pages en cada push a `main` que toque `docs/` o el spec.

### Gates de CI

Dos, y los dos existen por la misma razón — que "v1" signifique algo:

1. **`sync:spec --check`** — el devkit no puede quedar viejo respecto de la API sin que el build se ponga rojo. Sin esto, esta copia del spec envejece en silencio y el SDK publicado deja de describir el contrato publicado.
2. **`gen:check`** — nadie edita a mano un archivo generado, y nadie actualiza el spec sin regenerar.

## Contrato y estabilidad

La API es **v1** con **política de deprecación de doce meses**: nada se elimina ni se renombra sin ese aviso, con headers `Deprecation`/`Sunset` en las respuestas afectadas y una entrada en el changelog. Los cambios aditivos (campos nuevos, valores de enum nuevos, endpoints nuevos) salen sin aviso, así que **deserializá ignorando lo desconocido y tené siempre una rama `default`**.

La política completa: <https://docs.truo.cloud/deprecation>.

## Licencia

MIT.
