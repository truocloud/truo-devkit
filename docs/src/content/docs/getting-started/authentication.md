---
title: Authentication
description: API keys, scopes, per-service allowlists, and how the CLI creates its own credential without you copy-pasting anything.
sidebar:
  order: 1
---

One scheme, everywhere: `Authorization: Bearer <token>`.

```bash
curl https://api.truo.cloud/v1/account \
  -H "Authorization: Bearer tc_live_..."
```

API keys are created from the panel (**Settings → API keys**) or with the CLI.
The token is **shown exactly once**: we store its hash, not the value. If you
lose it, create another.

## From the CLI, no copy-paste

```bash
truo auth login
```

It shows a code, you approve it in any browser — your phone works — and the CLI
**creates its own API key** with the scopes it needs. That key is stored in
`~/.truo/credentials.json` with `0600` permissions.

Pasting a key by hand works, but that's exactly the step where it ends up in
shell history, in a chat, or in a support ticket. The device flow
([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)) removes that step,
and it works over SSH inside a bastion — which is where half of all logins
happen.

```bash
truo auth login --scopes vps:read,vps:power   # scoped down
truo auth login --token tc_live_...           # for CI, no browser
truo auth status                              # who am I, with which credential
```

In CI, export `TRUO_TOKEN`. Precedence: `--token` → `TRUO_TOKEN` → stored
profile.

## Scopes

A flat `<resource>:<action>` grammar, with `<resource>:*` and `*` wildcards. No
nesting: the moment you allow `vps:backups:read` you're building a policy
language, and the next step is wanting IAM.

| Resource | Actions |
|---|---|
| `account` | `read`, `write` |
| `services` | `read`, `write` |
| `vps` | `read`, `power`, `write`, `console` |
| `dbaas` | `read`, `write`, `credentials` |
| `caas` | `read`, `write`, `deploy` |
| `lb` | `read`, `write` |
| `dns` | `read`, `write` |
| `mailgateway` | `read`, `write`, `send` |
| `objectstorage` | `read`, `write`, `keys` |
| `operations`, `audit` | `read` |

An action gets split out of the generic `write` only when granting it is
**materially more dangerous**, not for tidiness:

- `vps:console` is not "another write": it's full access to the operating
  system.
- `dbaas:credentials` reveals the engine's admin password — full access to the
  data, and it **survives revoking the key**.
- `objectstorage:keys` mints long-lived S3 credentials.

### What a key can never do

`apikeys:*` and `users:*` are **not grantable to an API key**, not even under
`*`. A key that can create keys defeats revocation; one that can create
sub-users is persistence, because it survives revoking the key. Those scopes
exist only for sessions.

*There is no way to configure an API key that can create API keys.* It's a
property of the system, not a recommendation.

## Four gates at once

A call is authorized only when **all four** hold:

1. The **key's scopes** include the one the operation requires.
2. The **user who owns the key** has the corresponding permission on the
   account.
3. That user's **per-service grants** meet the required level.
4. The key's **service allowlist** includes the service (or is empty, which
   means "all").

Gate 2 has a consequence worth knowing up front: if a sub-user creates a key
and you later revoke one of their permissions, **the key loses it too**.
Offboarding someone neutralizes their keys without you having to remember to
revoke them one by one.

## 404, never 403

A service that doesn't exist and one that exists but your credential can't see
return **the same thing: 404**. A 403 would confirm the service exists, and
that turns the API into an enumeration oracle for anyone with a valid key from
another account.

If you expected to see something and got a 404, check the key's allowlist and
the user's grants before hunting for the bug elsewhere.

## Revoking

```bash
truo auth token list
truo auth token revoke key_42
```

Revocation propagates in **under a second** in the normal case, and in the
worst case — if the invalidation channel is down — within **60 seconds**.
That's the number, not "immediately".

`truo auth logout` deletes the credential **from this machine** and revokes
nothing: if you copied it elsewhere, it still works.
