# `@truocloud/sdk`

Cliente TypeScript de la API pública de TruoCloud (`api.truo.cloud/v1`).
**Cero dependencias**: todo lo que usa —`fetch`, `AbortSignal`, `crypto`— es
estándar en Node 20+, Bun, Deno y el navegador.

```bash
npm i @truocloud/sdk
```

```ts
import { TruoClient } from "@truocloud/sdk";

const truo = new TruoClient();              // lee TRUO_TOKEN del entorno
const vps = await truo.vps.get("svc_10432");

// Las listas paginan solas: el cursor no se toca nunca.
for await (const svc of truo.services.listAll()) console.log(svc.id);

// Lo que tarda devuelve una operación, y se espera.
const op = await truo.vps.power("svc_10432", { action: "stop" });
await truo.operations.wait(op.id);
```

Los métodos, los tipos y los metadatos se **generan del OpenAPI**: si la API
renombra un campo, el código que lo usa deja de compilar en vez de devolver
`undefined` en producción.

## Lo que hace el transporte por vos

- **Reintentos** con backoff exponencial y jitter en 429/5xx, respetando
  `Retry-After`. Nunca reintenta un POST no idempotente salvo que lleve
  `Idempotency-Key`.
- **Idempotencia automática** en las operaciones que la aceptan, para que un
  reintento no cree dos veces la misma cosa.
- **Paginación por cursor**, con `listAll()` como iterador asíncrono.
- **Avisos de deprecación**: si un endpoint trae `Deprecation`/`Sunset`, se
  avisa una vez por operación en vez de que te enteres el día que se apaga.

## Errores

Jerarquía tipada, para poder distinguir sin leer strings:

```ts
import { AuthorizationError, RateLimitError } from "@truocloud/sdk";

try {
  await truo.vps.power("svc_1", { action: "stop" });
} catch (err) {
  if (err instanceof AuthorizationError) /* falta scope o permiso */;
  if (err instanceof RateLimitError) /* err.retryAfter */;
}
```

---

Documentación: **[docs.truo.cloud](https://docs.truo.cloud)** ·
Código: [truocloud/truo-devkit](https://github.com/truocloud/truo-devkit) · MIT
