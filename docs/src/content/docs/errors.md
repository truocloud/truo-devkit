---
title: Errors
description: The API's error codes, what each one means, and what to do about it.
---

Every response `>= 400` has the same shape:

```jsonc
{ "error": {
    "type": "authorization_error",
    "code": "insufficient_scope",
    "message": "This operation requires the 'vps:write' scope.",
    "param": null,
    "request_id": "req_01JQ8X…"
} }
```

- **`type`** is the coarse class. Useful for exception hierarchies in a client.
- **`code`** is the specific identity. **It is stable and never renamed**:
  branch on this.
- **`message`** is for humans and can be improved any day. Don't parse it.
- **`request_id`** is the only thing support needs to find your call.

## `authentication_error` — 401

| `code` | What happened | What to do |
|---|---|---|
| `missing_credentials` | You didn't send `Authorization` | Add `Authorization: Bearer …` |
| `invalid_credentials` | The token is invalid, revoked, or expired | `truo auth login`. The three cases collapse on purpose: telling them apart would tell a token prober which ones exist |
| `credential_revoked` | The key was revoked | Create another |
| `credential_expired` | The key had an expiry and it passed | Create another |

## `authorization_error` — 403

| `code` | What happened | What to do |
|---|---|---|
| `insufficient_scope` | The key lacks the scope | Create a key with that scope; an existing key can't be widened |
| `insufficient_permission` | The **user who owns** the key lacks the permission on the account | Ask the account owner. Revoking a permission also strips it from that person's keys |
| `insufficient_service_access` | The user has no grant on that service | Same as above |
| `scope_not_grantable` | You requested `apikeys:*` or `users:*` for a key | Not possible, by design. See [authentication](/getting-started/authentication/) |

:::note
A service that doesn't exist and one your credential can't see both return
**404**, not 403. See below.
:::

## `invalid_request_error` — 400 / 404 / 409

| `code` | Status | What happened |
|---|---|---|
| `validation_failed` | 400 | The body or a parameter fails the schema. `param` says which |
| `not_found` | 404 | It doesn't exist, **or doesn't exist for this credential**. The API doesn't distinguish the two on purpose |
| `already_exists` | 409 | A resource with that identifier already exists |
| `idempotency_conflict` | 409 | You reused an `Idempotency-Key` with a different body |
| `invalid_cursor` | 400 | The cursor isn't one of ours, or is from a previous version. **Restart the listing**: cursors aren't durable |
| `unsupported_for_product` | 400 | The operation doesn't apply to that product (for example, SPICE console on a legacy VPS). Check `capabilities` in the resource's `GET` |

## `rate_limit_error` — 429

| `code` | What to do |
|---|---|
| `rate_limited` | Wait for `Retry-After`. See [rate limits](/rate-limits/) |
| `quota_exceeded` | It's a plan limit, not a per-minute one: retrying won't help |

## `api_error` — 5xx

| `code` | What happened | What to do |
|---|---|---|
| `internal_error` | It's on us | Retry with backoff. If it persists, send us the `request_id` |
| `upstream_unavailable` | A backing system isn't responding | Retry with backoff |
| `upstream_error` | A backing system returned an error | Retry; if it persists, `request_id` |
| `operation_failed` | An asynchronous operation ended in `failed` | The `error` inside the operation says why. Retrying without changing anything usually repeats the result |

## Retrying

Retry with exponential backoff and jitter on **429, 500, 502, 503, and 504**,
honoring `Retry-After` when present.

**Never retry a `POST` without an `Idempotency-Key`.** The SDK won't — which
is why it sends one automatically on operations that accept it.

## CLI exit codes

So a script never has to read the error text.

| | | |
|---|---|---|
| `0` all good | `1` CLI bug | `2` usage error |
| `3` missing or invalid credential | `4` missing scope or permission | `5` not found |
| `6` conflict | `7` rate limited | `8` API failure |
| `9` operation wait timed out (**it's still running**) | `10` you cancelled a confirmation | `130` Ctrl-C |
