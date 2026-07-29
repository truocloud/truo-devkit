---
title: SDK de TypeScript
description: '@truocloud/sdk: cliente sin dependencias con reintentos, idempotencia, paginación por cursor y errores tipados.'
sidebar:
  order: 2
---

```bash
npm install @truocloud/sdk
```

**Cero dependencias en runtime.** Todo lo que usa —`fetch`, `AbortSignal`,
`crypto`— es estándar en Node 20+, Bun, Deno y el navegador. Un SDK que arrastra
dependencias las arrastra a la aplicación de quien lo instala, y acá no hacía
falta ninguna.

```ts
import { TruoClient } from "@truocloud/sdk";

const truo = new TruoClient();                       // lee TRUO_TOKEN
// o: new TruoClient({ token, baseUrl, timeoutMs, maxRetries })

const vps = await truo.vps.get("svc_10432");
console.log(vps.hostname, vps.status);
```

Los métodos y los tipos **se generan del OpenAPI**: si la API renombra un campo,
el código que lo usa deja de compilar en vez de devolver `undefined` en
producción.

## Listas

```ts
// Una página.
const page = await truo.vps.list({ limit: "25" });
console.log(page.data, page.has_more, page.next_cursor);

// Todas, siguiendo el cursor sola.
for await (const vps of truo.vps.listAll()) console.log(vps.id);
```

El cursor es opaco y el SDK no lo expone en el iterador: no hay forma de
guardarlo por accidente entre sesiones.

## Operaciones que tardan

```ts
const op = await truo.vps.power("svc_10432", { action: "stop" });

const final = await truo.operations.wait(op.id, {
  timeoutMs: 15 * 60_000,
  onProgress: (o) => console.log(o.status, o.progress),
});
```

`wait` hace polling con backoff de 1 s a 5 s. Si la API marca una operación como
`stale` —el sistema de fondo tuvo un hipo— **la espera continúa** en vez de
abortar: un problema que no es tuyo no debería costarte la operación.

## Reintentos e idempotencia

El transporte reintenta con backoff exponencial y jitter en 408, 429, 500, 502,
503 y 504, respetando `Retry-After`.

**Nunca reintenta un `POST` que no lleve `Idempotency-Key`** — y por eso genera
una automáticamente en toda operación que la acepte. Un reintento por timeout de
red no crea dos backups.

```ts
// Explícita, cuando querés que dos ejecuciones del mismo job colapsen.
await truo.vps.backups.create("svc_10432", { idempotencyKey: "nocturno-2026-07-29" });
```

## Errores

Jerarquía tipada, para poder distinguir sin leer strings:

```ts
import {
  TruoError,
  AuthenticationError,
  AuthorizationError,
  InvalidRequestError,
  RateLimitError,
  ApiError,
} from "@truocloud/sdk";

try {
  await truo.vps.power("svc_1", { action: "stop" });
} catch (err) {
  if (err instanceof AuthorizationError) {
    console.error(err.code);       // insufficient_scope | insufficient_permission | …
  } else if (err instanceof RateLimitError) {
    console.error(`reintentar en ${err.retryAfter}s`);
  } else if (err instanceof TruoError) {
    console.error(err.status, err.code, err.requestId);   // ← el requestId, siempre
  }
}
```

Ver la [tabla completa de códigos](/errores/).

## Deprecaciones

Si un endpoint responde con `Deprecation`/`Sunset`, el SDK lo avisa por `stderr`
**una vez por operación** — no en cada llamada, para que sirva de aviso y no de
ruido. Es la forma de enterarse sin leer el changelog.

## Metadatos del contrato

```ts
import { OPERATIONS, getOperation } from "@truocloud/sdk";

const meta = getOperation("vps.reinstall");
meta.scope;        // "vps:write"
meta.danger;       // "destructive"
meta.longRunning;  // true
meta.idempotent;   // true
```

Es lo que permite construir un gate de confirmación genérico en vez de una lista
de operaciones peligrosas escrita a mano. Ver [agentes](/agentes/).

## Escape hatch

```ts
const res = await truo.request("vps.get", { path: { id: "svc_1" } });
res.data;
res.requestId;
res.rateLimit;
```
