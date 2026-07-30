# `truo` — the TruoCloud CLI

Operate VPS, DNS, managed databases, containers, load balancers, Object Storage
and Mail Gateway from the terminal.

The command tree **is generated from the OpenAPI spec** of `api.truo.cloud`:
every endpoint declares its command, its arguments and whether it is dangerous.
A new endpoint shows up in the CLI without anyone writing CLI code.

```
npm i -g @truocloud/cli        # or: npx @truocloud/cli
brew install truocloud/tap/truo
scoop bucket add truocloud https://github.com/truocloud/scoop-bucket && scoop install truo
curl -fsSL https://raw.githubusercontent.com/truocloud/truo-devkit/main/install.sh | sh
```

## Getting started

```bash
truo auth login                 # opens the browser and creates this machine's API key
truo services list
truo vps power svc_10432 stop   # waits until it finishes; --no-wait to skip waiting
truo dns record list example.com
```

`truo auth login` uses the device flow (RFC 8628): it shows a code, you approve
it in any browser — your phone's works — and the CLI creates **its own API
key**, which gets stored. That key can be revoked on its own from the panel
without touching the rest of your credentials. In CI, `--token` or the
`TRUO_TOKEN` variable.

## Output

`table` by default, and everything that is not data goes to **stderr** — so
`truo vps list -o json > f.json` always comes out clean.

```bash
truo vps list -o json | jq '.[].hostname'
truo vps list -o id | xargs -n1 truo vps get
truo vps get svc_1 --field hostname
```

## Exit codes

They are public contract, so a script does not have to parse the error text.

| | | | |
|---|---|---|---|
| `0` ok | `1` internal | `2` usage | `3` no credential |
| `4` no permission | `5` not found | `6` conflict | `7` rate limit |
| `8` API error | `9` operation timeout | `10` cancelled | `130` Ctrl-C |

## Zero dependencies

Published bundled: `npm i -g` downloads one file, not a `node_modules` tree.
The brew, scoop and `install.sh` binaries are single-file and do not need Node.

---

Documentation: **[docs.truo.cloud](https://docs.truo.cloud)** ·
Code: [truocloud/truo-devkit](https://github.com/truocloud/truo-devkit) · MIT
