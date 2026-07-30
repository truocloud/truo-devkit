---
title: "`truo` CLI"
description: Installation, output modes, exit codes, profiles, and the escape hatch for what the CLI doesn't cover yet.
sidebar:
  order: 1
---

```bash
npm install -g @truocloud/cli
brew install truocloud/tap/truo
scoop bucket add truocloud https://github.com/truocloud/scoop-bucket && scoop install truo
curl -fsSL https://raw.githubusercontent.com/truocloud/truo-devkit/main/install.sh | sh
```

Binaries are published with their `SHA256SUMS`, and brew, scoop, and
`install.sh` verify them. The npm packages ship with
[provenance](https://docs.npmjs.com/generating-provenance-statements).

```bash
truo auth login
truo services list
truo vps power svc_10432 stop
```

The command tree **is generated from the OpenAPI document**. A new endpoint
shows up in the CLI — with its help text, its arguments, and its valid
values — without anyone writing CLI code.

## Output

Tables by default. Everything that isn't data — progress, warnings,
confirmations — goes to **`stderr`**, so `truo vps list -o json > f.json`
always comes out clean.

```bash
truo vps list -o json | jq '.[].hostname'
truo vps list -o jsonl                  # one line per item, for streaming
truo vps list -o id | xargs -n1 truo vps get
truo vps get svc_1 --field hostname     # trims the output
```

## Long-running operations

They are **waited on by default**. A CLI that returns before the thing
actually happened forces every script to write its own polling loop, and half
of them never do.

```bash
truo vps power svc_10432 stop              # waits
truo vps power svc_10432 stop --no-wait    # prints the id and exits 0
truo operation wait op_01JQ8X…             # pick it up later
```

If the wait times out, the CLI exits with **9** and prints the id: the
operation **is still running** — we just stopped watching it.

## Confirmations

Anything marked `destructive` in the contract asks first. `--yes` skips the
prompt, and without an interactive terminal the CLI **fails** instead of
assuming yes.

## Exit codes

A public contract, so scripts never have to parse error text.

| | | |
|---|---|---|
| `0` ok | `1` CLI bug | `2` usage error |
| `3` no credential | `4` missing scope or permission | `5` not found |
| `6` conflict | `7` rate limited | `8` API failure |
| `9` wait timed out | `10` you cancelled | `130` Ctrl-C |

## Profiles

```bash
truo config use production
truo config set base_url https://api.truo.cloud
truo config list
```

Configuration lives in `~/.truo/config.json` and **credentials in a separate
file** (`credentials.json`, mode `0600`). They're split on purpose: mixed
together, it's only a matter of time before someone pastes a token into a
ticket.

Precedence: `--token` → `TRUO_TOKEN` → profile.

## The escape hatch

For what the API already exposes and the CLI doesn't wrap yet. It doesn't
validate arguments or ask for confirmation: it's raw on purpose.

```bash
truo api GET /v1/vps
truo api POST /v1/vps/svc_1/power --body-json '{"action":"stop"}'
```

It exists so you **never have to wait for a CLI release** to use something the
API already has.

## Shell completions

```bash
eval "$(truo completion bash)"     # bash · zsh · fish
```

Also generated from the command tree, so it can't go stale either.
