# `@truocloud/sdk`

TypeScript client for the TruoCloud public API (`api.truo.cloud/v1`).
**Zero dependencies**: everything it uses — `fetch`, `AbortSignal`, `crypto` —
is standard in Node 20+, Bun, Deno and the browser.

```bash
npm i @truocloud/sdk
```

```ts
import { TruoClient } from "@truocloud/sdk";

const truo = new TruoClient();              // reads TRUO_TOKEN from the environment
const vps = await truo.vps.get("svc_10432");

// Lists paginate on their own: you never touch the cursor.
for await (const svc of truo.services.listAll()) console.log(svc.id);

// Anything slow returns an operation, and you wait for it.
const op = await truo.vps.power("svc_10432", { action: "stop" });
await truo.operations.wait(op.id);
```

The methods, the types and the metadata are **generated from the OpenAPI
spec**: if the API renames a field, the code using it stops compiling instead
of returning `undefined` in production.

## What the transport does for you

- **Retries** with exponential backoff and jitter on 429/5xx, honoring
  `Retry-After`. It never retries a non-idempotent POST unless it carries an
  `Idempotency-Key`.
- **Automatic idempotency** on the operations that accept it, so a retry does
  not create the same thing twice.
- **Cursor pagination**, with `listAll()` as an async iterator.
- **Deprecation notices**: if an endpoint carries `Deprecation`/`Sunset`, you
  get warned once per operation instead of finding out the day it goes dark.

## Errors

Typed hierarchy, to tell them apart without reading strings:

```ts
import { AuthorizationError, RateLimitError } from "@truocloud/sdk";

try {
  await truo.vps.power("svc_1", { action: "stop" });
} catch (err) {
  if (err instanceof AuthorizationError) /* missing scope or permission */;
  if (err instanceof RateLimitError) /* err.retryAfter */;
}
```

---

Documentation: **[docs.truo.cloud](https://docs.truo.cloud)** ·
Code: [truocloud/truo-devkit](https://github.com/truocloud/truo-devkit) · MIT
