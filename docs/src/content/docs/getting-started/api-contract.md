---
title: The API contract
description: Response shapes, cursor pagination, idempotency, asynchronous operations, and request IDs.
sidebar:
  order: 2
---

## Responses

No envelope. The HTTP status already says whether it worked; a
`{"success":true,"data":…}` costs an `unwrap` in every SDK, every `jq`, and
every tool result, in exchange for zero information.

```jsonc
// a resource
{ "object": "vps", "id": "svc_10432", "hostname": "web-01", "status": "running" }

// a collection
{ "object": "list", "data": [ … ], "has_more": true, "next_cursor": "eyJvIjo1MH0" }

// an error — any response >= 400
{ "error": {
    "type": "authorization_error",
    "code": "insufficient_scope",
    "message": "This operation requires the 'vps:write' scope.",
    "param": null,
    "request_id": "req_01JQ8X…"
} }
```

`truo vps get svc_1 | jq .hostname` works with zero ceremony — that's the test.

Branch on **`code`**, never on the text of `message`: the `code` is stable and
the `message` can be improved any day. See [errors](/errors/).

## Prefixed IDs

Both `10432` and `svc_10432` are accepted; **`svc_10432` is always returned**.
A bare integer is indistinguishable from an invoice ID in a log, in an `argv`,
or in a model's context, and the error the prefix buys you — *"expected a
service ID, got `inv_9912`"* — is worth the whole exercise.

## Pagination

```
GET /v1/vps?limit=25&cursor=eyJvIjo1MCwidiI6MX0
```

`limit` goes from 1 to 100. The response carries `has_more` and `next_cursor`.
**There is no total**: counting rows isn't cheap and nobody uses it for
anything but painting a number.

:::caution[The cursor is opaque]
Don't construct it, don't parse it, and don't store it across sessions. Its
encoding changes without notice — that's precisely what lets us move from
`offset` to `keyset` without breaking anyone.
:::

The SDK and the CLI follow it for you:

```ts
for await (const vps of truo.vps.listAll()) console.log(vps.hostname);
```

## Idempotency

Every `POST`, `PATCH`, `PUT`, and `DELETE` accepts `Idempotency-Key`.

```bash
curl https://api.truo.cloud/v1/vps/svc_10432/backups \
  -X POST \
  -H "Authorization: Bearer $TRUO_TOKEN" \
  -H "Idempotency-Key: nightly-backup-2026-07-29"
```

- Same key + same body → the original response is replayed, with
  `Idempotent-Replay: true`. **It does not run twice.**
- Same key + different body → `409 idempotency_conflict`.
- Only `2xx` responses are stored: a `5xx` lets you retry with the same key.
- Keys live for 24 hours.

The SDK generates one automatically for operations that accept it, so a retry
after a network timeout doesn't create two backups.

## Asynchronous operations

Anything slow returns **`202`** with a `Location` header and an `operation`
object:

```jsonc
{
  "object": "operation",
  "id": "op_01JQ8XKM4N7P2R9T",
  "type": "vps.reinstall",
  "status": "running",       // queued | running | succeeded | failed
  "progress": 40,
  "resource": { "object": "vps", "id": "svc_10432" },
  "result": null,
  "error": null
}
```

Poll `GET /v1/operations/{id}` until `succeeded` or `failed`. The SDK ships
`truo.operations.wait(id)` and the CLI waits by default (`--no-wait` to skip
waiting).

If the backing system hiccups, the operation is still returned — with
`"stale": true` instead of a `500`. A polling client shouldn't lose its
operation over a problem that isn't its own — **keep waiting**, don't abort.

## `X-Request-Id`

Every response carries it, and every error response repeats it inside the
body.

```
X-Request-Id: req_01JQ8XKM4N7P2R9TVWXYZ
```

It's the only thing support needs to find your exact call. **Log it.** The CLI
prints it on every error, and `truo api` always shows it.

## Concurrency control

For DNS, a `GET` of a record set returns an `ETag` and `PATCH` accepts
`If-Match`. Without it, two concurrent writers silently clobber each other;
with it, the second one gets a `412`.

Other resources don't have `ETag` yet. Adding it later breaks nothing, so
don't assume its absence.

## Where all of this comes from

The OpenAPI document **is generated from the handlers' own validation
schemas**. An endpoint can't accept a body the spec doesn't describe, because
it's literally the same object doing the validating and the documenting.

From there — with no hand-written link in the chain — come the SDK's types,
the client's methods, the CLI's command tree, and these reference pages.

The spec lives at [`/v1/openapi.json`](https://api.truo.cloud/v1/openapi.json)
and also ships as a package: `npm i @truocloud/openapi`.
