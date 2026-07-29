# `@truocloud/openapi`

El documento OpenAPI 3.1 de `api.truo.cloud/v1`, tal cual lo sirve la API.

```bash
npm i @truocloud/openapi
```

```ts
import openapi, { eachOperation, API_VERSION } from "@truocloud/openapi";

console.log(API_VERSION);                    // "1.0.0"
for (const { path, method, op } of eachOperation()) {
  console.log(method.toUpperCase(), path, op["x-truo-scope"]);
}
```

O el JSON crudo, para las herramientas que lo quieren así:

```ts
import spec from "@truocloud/openapi/v1.json" with { type: "json" };
```

## Por qué existe como paquete

Para que el SDK, el CLI y las herramientas de terceros consuman **exactamente el
mismo documento** que `GET /v1/openapi.json`. Cualquier divergencia entre lo que
publica la API y lo que asume una herramienta es un bug, y tenerlo en un solo
lugar es lo que permite detectarlo con un diff.

La cadena entera es: handler → schema de validación → spec → SDK/CLI. **No hay
ningún eslabón escrito a mano.**

## Extensiones `x-truo-*`

Cada operación declara lo que no cabe en OpenAPI estándar:

| | |
|---|---|
| `x-truo-scope` | Scope requerido (`vps:write`) |
| `x-truo-danger` | `none` · `reversible` · `destructive` |
| `x-truo-long-running` | Devuelve `202` + una operación que hay que esperar |
| `x-truo-idempotent` | Acepta `Idempotency-Key` |
| `x-truo-rate-bucket` | `read` · `write` · `expensive` |
| `x-truo-cli` | Comando y posicionales del CLI |
| `x-truo-mcp` | Toolset, acción y si es de solo lectura |

El `operationId` es **contrato permanente**: es la clave de join entre los
métodos del SDK, los comandos del CLI, las acciones del MCP y las anclas de la
documentación.

---

Documentación: **[docs.truo.cloud](https://docs.truo.cloud)** ·
Código: [truocloud/truo-devkit](https://github.com/truocloud/truo-devkit) · MIT
