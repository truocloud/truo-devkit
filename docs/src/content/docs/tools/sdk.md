---
title: TypeScript SDK
description: '@truocloud/sdk: a zero-dependency client with retries, idempotency, cursor pagination, and typed errors.'
sidebar:
  order: 2
---

```bash
npm install @truocloud/sdk
```

**Zero runtime dependencies.** Everything it uses — `fetch`, `AbortSignal`,
`crypto` — is standard in Node 20+, Bun, Deno, and the browser. An SDK that
drags dependencies along drags them into the app of everyone who installs it,
and none were needed here.

```ts
import { TruoClient } from "@truocloud/sdk";

const truo = new TruoClient();                       // reads TRUO_TOKEN
// or: new TruoClient({ token, baseUrl, timeoutMs, maxRetries })

const vps = await truo.vps.get("svc_10432");
console.log(vps.hostname, vps.status);
```

Methods and types **are generated from the OpenAPI document**: if the API
renames a field, code that uses it stops compiling instead of returning
`undefined` in production.

## Lists

```ts
// One page.
const page = await truo.vps.list({ limit: "25" });
console.log(page.data, page.has_more, page.next_cursor);

// All of them, following the cursor for you.
for await (const vps of truo.vps.listAll()) console.log(vps.id);
```

The cursor is opaque and the SDK doesn't expose it in the iterator: there's no
way to accidentally store it across sessions.

## Long-running operations

```ts
const op = await truo.vps.power("svc_10432", { action: "stop" });

const final = await truo.operations.wait(op.id, {
  timeoutMs: 15 * 60_000,
  onProgress: (o) => console.log(o.status, o.progress),
});
```

`wait` polls with backoff from 1 s to 5 s. If the API marks an operation as
`stale` — the backing system hiccuped — **the wait continues** instead of
aborting: a problem that isn't yours shouldn't cost you the operation.

## Retries and idempotency

The transport retries with exponential backoff and jitter on 408, 429, 500,
502, 503, and 504, honoring `Retry-After`.

**It never retries a `POST` without an `Idempotency-Key`** — which is why it
generates one automatically for every operation that accepts it. A retry after
a network timeout doesn't create two backups.

```ts
// Explicit, when you want two runs of the same job to collapse into one.
await truo.vps.backups.create("svc_10432", { idempotencyKey: "nightly-2026-07-29" });
```

## Errors

A typed hierarchy, so you can tell errors apart without reading strings:

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
    console.error(`retry in ${err.retryAfter}s`);
  } else if (err instanceof TruoError) {
    console.error(err.status, err.code, err.requestId);   // ← the requestId, always
  }
}
```

See the [full code table](/errors/).

## Deprecations

If an endpoint responds with `Deprecation`/`Sunset` headers, the SDK warns on
`stderr` **once per operation** — not on every call, so it stays a warning
instead of becoming noise. It's how you find out without reading the
changelog.

## Contract metadata

```ts
import { OPERATIONS, getOperation } from "@truocloud/sdk";

const meta = getOperation("vps.reinstall");
meta.scope;        // "vps:write"
meta.danger;       // "destructive"
meta.longRunning;  // true
meta.idempotent;   // true
```

This is what lets you build a generic confirmation gate instead of a
hand-written list of dangerous operations. See [AI agents](/ai-agents/).

## Escape hatch

```ts
const res = await truo.request("vps.get", { path: { id: "svc_1" } });
res.data;
res.requestId;
res.rateLimit;
```
