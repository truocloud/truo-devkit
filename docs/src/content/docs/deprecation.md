---
title: Deprecation policy
description: Twelve months' notice, Deprecation and Sunset headers, and what changes without notice.
---

This is a commitment, not an engineering note. It's also the criterion by
which the API gets to call itself **v1** and not beta.

## What `v1` guarantees

While `v1` is current, **none of this happens** without the notice described
below:

- Removing an endpoint, a response field, a parameter, an enum value, or an
  `operationId`.
- Renaming any of them. Renaming is removing plus creating.
- Making an optional parameter required, or narrowing the range of accepted
  values.
- Changing a field's type, the HTTP status code of an already-documented case,
  or the `code` of an error.

`operationId`s (`vps.power`, `dns.records.patch`) are **stable forever**:
they're the key by which the SDK, the CLI, agent tooling, and this
documentation reference each other. An `operationId` is never recycled, even
after the operation is removed.

## What changes without notice

These changes are **additive** and can ship any day. A client that breaks on
them has a bug of its own — and we say so up front so it never becomes an
argument:

- **New fields** in any response. Deserialize ignoring the unknown; don't use
  strict parsers that fail on an extra field.
- **New values** in a response enum — a new VPS state, a new database engine.
  Always have a `default` branch.
- **New endpoints, resources, and optional parameters.**
- **The contents of the pagination cursor.** It's an opaque string: pass it
  through as-is and don't store it across sessions.
- **Security fixes** that close access that should never have existed. If a
  permission was misapplied, fixing it doesn't wait twelve months.
- **Undocumented behavior**: the order of a list without `sort`, the exact
  text of an error `message` (the `code` is stable), the timing of an
  asynchronous operation.
- **The rate limits**, within reason and communicated in the `RateLimit-*`
  headers of every response.

## The notice: twelve months

Every breaking change to `v1` gets **twelve months** between the announcement
and the cutoff. During that window:

1. **It's published in the changelog**, with the cutoff date and the concrete
   migration path.
2. **We email** the owner of every API key that called the affected operation
   in the previous 90 days. It's not a newsletter: if your key doesn't use it,
   we don't write to you.
3. **Responses carry headers** from the day of the announcement:

   ```http
   Deprecation: Sun, 27 Jul 2026 00:00:00 GMT
   Sunset: Tue, 27 Jul 2027 00:00:00 GMT
   Link: <https://docs.truo.cloud/changelog/…>; rel="deprecation"
   ```

   `Deprecation` is the announcement date and `Sunset` the cutoff
   ([RFC 9745](https://datatracker.ietf.org/doc/html/rfc9745) and
   [RFC 8594](https://datatracker.ietf.org/doc/html/rfc8594)). You can detect
   that you're using something doomed **without reading anything**: logging
   the header's presence is enough. The SDK and the CLI emit it as a warning
   on `stderr`.
4. **The OpenAPI document marks the operation** `deprecated: true`, so a spec
   diff makes it visible in any pipeline.

A deprecated operation **keeps working exactly the same** until the `Sunset`
date. It isn't degraded, its limits aren't lowered, no latency is added.

## New versions

A change that doesn't fit in the additive bucket produces **`/v2`**, not a
broken `v1`. `v1` and `v2` run side by side, and `v1`'s twelve months start
when `v2` leaves beta.

The version is in the URL: visible in any log, and not dependent on you
configuring a header.

## What's excluded

- **Anything marked `beta`** in the OpenAPI document and in this
  documentation. The marker is explicit, the guarantee is none, and nothing
  enters beta unannounced.
- **Any endpoint not in
  [`/v1/openapi.json`](https://api.truo.cloud/v1/openapi.json).** If it's not
  in the spec, it has no contract.

## How it's enforced

It doesn't depend on anyone remembering. The spec is generated from the
code — the validation schemas are both the runtime validator and the source of
the document — and **CI fails on any breaking change**, unless the change
carries the label that forces exactly this conversation.
