---
title: Webhooks
description: Signed HTTP notifications when an operation finishes or a service changes state, so you don't have to poll.
---

A webhook is an `https` URL you register once; the API POSTs a signed event
to it when something you subscribed to happens. Nothing about the rest of the
API changes: `GET /v1/operations/{id}` remains the source of truth, and a
webhook only saves you the polling.

## Register one

```bash
truo webhooks create --url https://example.com/hooks/truo \
  --events operation.completed --events service.active
```

```jsonc
{ "object": "webhook", "id": "whk_12", "url": "https://example.com/hooks/truo",
  "events": ["operation.completed", "service.active"], "enabled": true,
  "secret": "whsec_…" }              // ← shown only here. Store it.
```

- The URL must be **`https`** and reachable from the public internet. Private,
  loopback and link-local addresses are rejected at registration and again
  before every delivery.
- Up to **10** webhooks per account.
- `secret` is returned **once**, here and on `rotate-secret`. `GET` never
  shows it.
- Scope: `account:write` to manage, `account:read` to list and inspect.

## Events

| `type` | When | `data` |
|---|---|---|
| `operation.completed` | any operation ends, `succeeded` or `failed` — including the ones that finish inside the request | the [operation](/reference/operations/) |
| `service.active` | a service becomes active (first provisioning, or unsuspended) | a service summary |
| `service.suspended` | billing suspended it | a service summary |
| `service.terminated` | billing terminated it | a service summary |
| `webhook.ping` | you called `POST /v1/webhooks/{id}/ping` | `{ "object": "ping", … }` |

Subscribe to `"*"` to receive every type, including ones added later.

Every delivery has the same body:

```jsonc
{ "id": "evt_01JQ8X…", "object": "event", "type": "operation.completed",
  "created_at": "2026-09-16T00:00:00.000Z",
  "data": { "object": "operation", "id": "op_01JQ8X…", "type": "orders.create",
            "status": "succeeded", "resource": { "object": "order", "id": "ord_245" },
            "result": { "service": { "id": 1241, "status": "active" } }, … } }
```

## Verify the signature

Every request carries:

```
Truo-Signature: t=1760000000,v1=5f1a…c9   # HMAC-SHA256(secret, "<t>.<raw body>"), hex
Truo-Event:     operation.completed
Truo-Event-Id:  evt_01JQ8X…
Truo-Delivery:  dlv_01JQ8X…
```

Verify against the **raw body**, before parsing. Re-serializing the JSON
changes the bytes and the signature will never match.

```ts
import { verifyWebhookSignature } from "@truocloud/sdk";

export async function POST(req: Request) {
  const body = await req.text();                       // raw, unparsed
  const ok = await verifyWebhookSignature({
    secret: process.env.TRUO_WEBHOOK_SECRET!,
    body,
    header: req.headers.get("truo-signature") ?? "",
  });
  if (!ok) return new Response("bad signature", { status: 401 });

  const event = JSON.parse(body);
  // …
  return new Response(null, { status: 204 });
}
```

Without the SDK: split the header on `,`, compute
`HMAC-SHA256(secret, t + "." + body)` in hex, compare it to `v1` in constant
time, and reject if `|now − t| > 300 s`.

Respond with any **2xx** within 10 seconds. Do the work afterwards.

## Retries

A non-2xx, a timeout, or a connection error schedules a retry:

| attempt | delay after failure |
|---|---|
| 1 → 2 | 30 s |
| 2 → 3 | 2 min |
| 3 → 4 | 10 min |
| 4 → 5 | 1 h |
| 5 → 6 | 6 h |
| after 6 | `failed` |

Retries carry the **same body** and a fresh signature. Make your handler
idempotent on `Truo-Event-Id` (or `id` in the body): the same event can be
delivered more than once.

## Debugging

```bash
truo webhooks deliveries whk_12               # newest first, with status and last error
truo webhooks delivery whk_12 dlv_01JQ8X…     # the exact body that was signed
truo webhooks redeliver whk_12 dlv_01JQ8X…    # send it again
truo webhooks ping whk_12                     # a test event to this webhook only
```

Each delivery keeps the exact body that was signed, the HTTP status of the
last attempt, and when the next one is due. `consecutive_failures` on the
webhook itself tells you at a glance whether the endpoint is healthy;
re-enabling a webhook resets it.
