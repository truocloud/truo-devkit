---
title: WordPress recipes
description: Turn a fresh managed WordPress into your stack — pinned plugins, config, roles, generated secrets — with one manifest applied over WP-CLI.
---

A **recipe** is a `recipe/v1` manifest you register once per account and apply
to any of your WordPress sites. It describes what you want on the site —
plugins at pinned versions, `wp-config` constants, options, roles, secrets we
generate for you, and a verification — and the API runs it over WP-CLI, in a
fixed order, as one [operation](/reference/operations/). Buying a site with
`truo orders create` and then applying your recipe is the "one-click" of a
golden image, without us having to know what your golden is.

## The manifest

```json
{
  "apiVersion": "recipe/v1",
  "name": "shop-golden",
  "version": "1.2.0",
  "requires": { "php": ">=8.3", "wp": ">=6.8", "memory_mb": 512 },
  "plugins": [
    { "slug": "wp-graphql", "version": "2.15.1", "activate": true },
    { "slug": "shop-sitebuilder",
      "url": "https://releases.example.com/plugins/shop-sitebuilder-1.2.0.zip",
      "sha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "activate": true }
  ],
  "constants": { "WP_MEMORY_LIMIT": "512M" },
  "options": {
    "shop_golden_version": "1.2.0",
    "graphql_general_settings": { "public_introspection_enabled": "off" }
  },
  "roles": [
    { "name": "store_owner", "display": "Store Owner", "caps": ["read", "upload_files"] }
  ],
  "secrets": ["GRAPHQL_JWT_AUTH_SECRET_KEY"],
  "verify": [
    { "wp": "plugin is-active wp-graphql" },
    { "http": { "path": "/graphql", "method": "POST", "body": "{\"query\":\"{__typename}\"}", "expect": 200 } }
  ]
}
```

| Field | What it does |
|---|---|
| `requires` | `php`, `wp` (`>=8.3`, `>6.8`, `8.3`) and `memory_mb` of the plan. Checked **before** anything runs: an unmet requirement is a `412 recipe_requirements_unmet` and the site is untouched |
| `plugins` | Installed in order, idempotently. `slug` alone installs from wordpress.org at `version`; `url` installs a zip over `https` and **requires `sha256`**. A plugin already at the pinned version is kept; another version is reinstalled to the pin. Max 40 |
| `constants` | `wp config set … --type=constant`. Strings, numbers and booleans. Platform constants (`DB_*`, `WP_HOME`, `WP_SITEURL`, content/plugin paths, multisite) are refused |
| `options` | `wp option update … --format=json`. Any JSON value. Max 200 |
| `roles` | `wp role create` + `wp cap add`. An existing role is fine |
| `secrets` | Constant names whose **values we generate** (32 random bytes) and write to `wp-config`. Never in the manifest, never in the operation. See [Claiming secrets](#claiming-secrets) |
| `verify` | The gate. `wp` runs a WP-CLI line (same allowlist as `truo wordpress wp-cli`); exit 0 is green. `http` requests a path on the site's URL and compares the status. Any red check fails the operation |

A manifest is validated in full when you register it: limits, allowed
constants, and **every WP-CLI line it would run**. What's rejected comes back
as `recipe_invalid` with `param` pointing at the field (`plugins[1].sha256`).
Values cannot contain single quotes, semicolons or backslashes: they end up as
shell arguments inside the site's container, and the allowlist is worth
nothing if a value can escape it.

Not in a recipe, on purpose: `mu-plugins` (there is no way to place a file
without running code; ship the file inside a plugin that installs its loader
on activation), themes (yours, day 2), and arbitrary commands.

## Register it

```bash
truo wordpress recipes create --body-json @shop-golden.json
```

Published versions are **immutable**. To change anything, publish a greater
`version` with `PUT`:

```bash
truo wordpress recipes update shop-golden --body-json @shop-golden-1.3.0.json
truo wordpress recipes get shop-golden --version 1.2.0   # older ones stay readable
```

A site that reports `shop-golden@1.2.0` always points at the manifest that
was applied to it. Up to 20 recipes per account, 50 versions each.

## Apply it

```bash
truo wordpress recipes apply svc_1241 --name shop-golden --wait
```

The request checks `requires` and answers `202` with an operation. Then, in
the background and in this order:

1. **`checksums`** — every `url` zip is downloaded (20 MB max, public `https`
   only) and hashed. A mismatch fails with `recipe_checksum_mismatch` and
   **nothing has been touched yet**.
2. **`backup`** — a manual backup of the site (skip with `--backup=false` on a
   site you don't care about; it counts against the daily allowance).
3. **`plugins`**, **`constants`**, **`options`**, **`roles`**, **`secrets`**.
4. **`verify`** — a red check fails with `recipe_verify_failed`. There is no
   automatic rollback: the site stays as the last step left it, and the backup
   from step 2 is the way back.
5. **`register`** — the site stores `truo_recipe = { name, version, applied_at }`
   in `wp_options`, so your own code can read what it is running.

The operation `result` shows each step with its status and detail, what
happened to each plugin (`installed`, `updated`, `kept`), and the verify
outcomes:

```jsonc
{ "recipe": "shop-golden", "version": "1.2.0",
  "steps": [ { "name": "requires", "status": "succeeded", "detail": "php 8.3.12, wp 6.8.2, 1024 MB" }, … ],
  "plugins": [ { "slug": "wp-graphql", "action": "kept", "version": "2.15.1", "activated": true }, … ],
  "verify": [ { "check": "POST /graphql", "ok": true, "detail": null } ],
  "secrets": { "names": ["GRAPHQL_JWT_AUTH_SECRET_KEY"],
               "claim": "/v1/wordpress/svc_1241/recipes/secrets" },
  "applied_at": "2026-09-16T12:00:00.000Z" }
```

If the process applying the recipe stops (a deploy, a crash), the operation is
marked `failed` with `error.code = interrupted` after 15 minutes without
progress. Reapplying is safe: every step is idempotent.

## Claiming secrets

Generated secret values are never in the operation, never in a webhook, never
in logs. Once the operation succeeds, fetch them **once**:

```bash
truo wordpress recipes claim-secrets svc_1241 --operation op_01JQ…
```

```json
{ "object": "recipe_secrets", "operation": "op_01JQ…", "recipe": "shop-golden",
  "version": "1.2.0", "secrets": { "GRAPHQL_JWT_AUTH_SECRET_KEY": "…" } }
```

That response deletes them server-side: a second claim is `not_found`. They
are kept, encrypted, for 24 hours after the operation succeeds; after that
they are gone too (the values are still in the site's `wp-config`; a new apply
with the same `secrets` generates new ones).

## Errors

| `code` | Status | When |
|---|---|---|
| `recipe_invalid` | 400 | The manifest doesn't validate. `param` is the field |
| `recipe_requirements_unmet` | 412 | `requires` vs. the site, decided before the operation exists |
| `not_found` | 404 | No recipe with that name, or that version, in this account |
| `already_exists` | 409 | A recipe with that name exists: publish a new version with `PUT` |
| `quota_exceeded` | 429 | 20 recipes per account or 50 versions per recipe |

Inside a failed operation, `error.code` is one of `recipe_checksum_mismatch`,
`recipe_backup_failed`, `recipe_step_failed`, `recipe_verify_failed`,
`interrupted` or `upstream_error`, with `error.step` naming the step.
