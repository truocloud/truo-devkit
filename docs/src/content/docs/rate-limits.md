---
title: Rate limits
description: How many calls per minute, how to read the RateLimit headers, and what to do with a 429.
---

There are three buckets, and every operation declares which one it belongs to
(`x-truo-rate-bucket` in the spec).

| Bucket | Per key | Per account | What lands here |
|---|---|---|---|
| `read` | 600 / min | 2,000 / min | `GET` requests |
| `write` | 120 / min | 400 / min | ordinary mutations |
| `expensive` | 20 / min | 60 / min | console, presign, restore, reinstall, logs |

The **per-account** limit exists so nobody dodges the per-key one by creating
twenty keys. The more restrictive of the two wins.

## The headers

They come on **every** response, not just 429s. That way you can slow down
before hitting the wall instead of after.

```http
RateLimit-Limit: 600
RateLimit-Remaining: 583
RateLimit-Reset: 41
RateLimit-Policy: 600;w=60
```

`RateLimit-Reset` is seconds until the window renews. The same values are
mirrored as `X-RateLimit-*` for clients that already expect that name.

## When the 429 arrives

```jsonc
{ "error": { "type": "rate_limit_error", "code": "rate_limited", … } }
```

It comes with `Retry-After` in seconds. **Honor it**: retrying earlier only
burns the next window's budget.

The SDK already does — exponential backoff with jitter, honoring
`Retry-After` — and never retries a `POST` that doesn't carry an
`Idempotency-Key`.

`quota_exceeded` is different: that's a plan limit, not a per-minute one.
Retrying won't help.

## If it's too small for you

Limits can be raised per key. Write to us with the key's `id` and what you're
building.

## If the rate limiter itself goes down

**It fails open.** Turning a cache outage into a full API outage would be
worse than the problem it prevents. That means a burst might occasionally get
through uncounted; it's not an invitation to rely on it.
