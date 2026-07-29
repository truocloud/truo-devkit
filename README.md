# TruoCloud devkit

Herramientas para operar [TruoCloud](https://www.truocloud.com) desde código, desde la terminal y —pronto— desde un agente de IA. Todo sale de un solo contrato: el OpenAPI de [`api.truo.cloud/v1`](https://api.truo.cloud/v1/openapi.json).

| Paquete | Qué es | Estado |
|---|---|---|
| [`@truocloud/openapi`](packages/openapi) | La especificación OpenAPI, versionada | beta |
| [`@truocloud/sdk`](packages/sdk) | Cliente TypeScript. **Cero dependencias** | beta |
| [`@truocloud/cli`](packages/cli) | El comando `truo` | beta |
| `@truocloud/mcp` | Servidor MCP para agentes | *(no existe todavía)* |

---

## Instalación

```bash
# CLI
npm install -g @truocloud/cli    # o: brew install truocloud/tap/truo
truo auth login

# SDK
npm install @truocloud/sdk
```

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
bun test                   # 43 tests, sin red
bun run gen:check          # falla si lo generado quedó viejo (esto corre en CI)

bun packages/cli/src/index.ts vps list   # el CLI desde el fuente
bun run build                            # dist/truo.js (npm)
bun run build --binaries                 # 6 binarios single-file
```

Dos gates de CI, y los dos existen por la misma razón — que "v1" signifique algo:

1. **`sync:spec --check`** — el devkit no puede quedar viejo respecto de la API sin que el build se ponga rojo. Sin esto, esta copia del spec envejece en silencio y el SDK publicado deja de describir el contrato publicado.
2. **`gen:check`** — nadie edita a mano un archivo generado, y nadie actualiza el spec sin regenerar.

## Contrato y estabilidad

La API es **v1** con **política de deprecación de doce meses**: nada se elimina ni se renombra sin ese aviso, con headers `Deprecation`/`Sunset` en las respuestas afectadas y una entrada en el changelog. Los cambios aditivos (campos nuevos, valores de enum nuevos, endpoints nuevos) salen sin aviso, así que **deserializá ignorando lo desconocido y tené siempre una rama `default`**.

La política completa: <https://docs.truo.cloud/deprecation>.

## Licencia

MIT.
