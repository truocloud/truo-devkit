# TruoCloud devkit

Tools to operate [TruoCloud](https://www.truocloud.com) from code, from the terminal and — soon — from an AI agent. Everything comes from a single contract: the OpenAPI spec of [`api.truo.cloud/v1`](https://api.truo.cloud/v1/openapi.json).

| Package | What it is | Status |
|---|---|---|
| [`@truocloud/openapi`](packages/openapi) | The OpenAPI specification, versioned | beta |
| [`@truocloud/sdk`](packages/sdk) | TypeScript client. **Zero dependencies** | beta |
| [`@truocloud/cli`](packages/cli) | The `truo` command | beta |
| [`docs/`](docs) | [docs.truo.cloud](https://docs.truo.cloud) — Astro Starlight + Scalar | beta |
| `@truocloud/mcp` | MCP server for agents | *(does not exist yet)* |

---

## Installation

```bash
# CLI — pick one
npm install -g @truocloud/cli
brew install truocloud/tap/truo
scoop bucket add truocloud https://github.com/truocloud/scoop-bucket && scoop install truo
curl -fsSL https://raw.githubusercontent.com/truocloud/truo-devkit/main/install.sh | sh

truo auth login

# SDK
npm install @truocloud/sdk
```

`truo auth login` opens a browser login (device flow, RFC 8628): it shows a code, you approve it from any browser — your phone's works — and the CLI creates **its own API key**, scoped down and revocable on its own. Nobody copies and pastes a key. In CI: `--token` or `TRUO_TOKEN`.

Binaries are published with their `SHA256SUMS`, and brew, scoop and `install.sh` verify them. The npm packages are published with [provenance](https://docs.npmjs.com/generating-provenance-statements): you can verify that the tarball came from this repo and this workflow.

## In thirty seconds

```bash
truo services list                       # what do I have
truo vps list -o json | jq '.[].hostname'
truo vps power svc_10432 stop            # waits until it finishes, on its own
truo dns record list example.com
```

```ts
import { TruoClient } from "@truocloud/sdk";

const truo = new TruoClient();                    // reads TRUO_TOKEN

for await (const svc of truo.services.listAll({ family: "vps" })) {
  console.log(svc.id, svc.name);
}

const op = await truo.vps.power("svc_10432", { action: "stop" });
await truo.operations.wait(op.id);
```

---

## How it is built

```
openapi/v1.json  ──┬─→  sdk/generated/types.ts        contract types
                   ├─→  sdk/generated/operations.ts   metadata (scope, danger, async)
                   ├─→  sdk/generated/resources.ts    the client's typed tree
                   └─→  cli/generated/commands.ts     the command tree
```

**No link in the chain is written by hand.** The spec comes from the Zod schemas of the API's handlers; from there come the types, the SDK methods and the CLI commands. A new operation that declares `x-truo-cli` shows up in the CLI on the next `bun run gen`, with its help, its arguments and its valid values.

What *is* written by hand is what a generator should never touch: the SDK transport (retries, idempotency, errors, cursor) and the CLI dispatcher. A bug there is expensive, and we do not want it rewriting itself every time the API grows.

### Zero dependencies, on purpose

Neither the SDK nor the CLI has runtime dependencies, and the codegen has no build dependencies either. Three concrete consequences:

- `npm i @truocloud/sdk` adds nothing to the client application's tree.
- The CLI compiles to a single-file binary (`bun build --compile`) for brew, scoop and `curl | sh`.
- Anyone can clone this repo, run `bun run gen` and get exactly the same artifacts, without installing anything.

The cost is a homegrown type emitter (`packages/codegen/src/ts-types.ts`) instead of `openapi-typescript`. It is worth paying because the subset of JSON Schema that Zod produces is small and well-known, and because when the emitter finds something it does not support it **fails the build** instead of silently emitting `any`.

---

## Development

```bash
bun install
bun run sync:spec          # fetches the spec from api.truo.cloud
bun run gen                # regenerates SDK + CLI
bun test                   # 52 tests, no network
bun run gen:check          # fails if generated code went stale (this runs in CI)

bun packages/cli/src/index.ts vps list   # the CLI from source
bun run build                            # dist/truo.js (npm)
bun run build --binaries                 # 6 single-file binaries + SHA256SUMS
bun run build:npm                        # the three packages ready to publish
```

### Publishing

A `vX.Y.Z` tag triggers everything. **The tag is the single source of the version**: the workflow writes it into the three `package.json` files before building, so you cannot tag `v0.3.0` and publish `0.2.9` because of a forgotten commit.

```bash
git tag v0.2.0 && git push origin v0.2.0
```

From there come: the three packages on npm with provenance, a GitHub release with the six binaries and the spec, and the brew formula and scoop manifest updated. The same gates as on every push (`sync:spec --check`, `gen:check`, `typecheck`, tests) run here too — a release is exactly the moment an out-of-sync spec becomes a published package that lies about the API.

To rehearse without publishing: *Actions → Release → Run workflow*.

The three packages share a version (`bun run version:set 0.2.0`). Different versions would force maintaining a compatibility table between things that come out of the same commit of the same spec.

### Documentation

`docs/` lives **outside** the `packages/*` workspace: the devkit clones and runs without installing anything, and Astro is a dependency tree that has no business in the middle of that. Install it only if you are going to touch the documentation.

```bash
cd docs && bun install
bun run dev        # generates from the spec and starts Astro
bun run generate   # only the generated parts, for inspection
```

From `openapi/v1.json` come: `public/openapi.json` (what Scalar consumes at `/reference`), `public/llms.txt` and `llms-full.txt` (the catalog for agents), and one reference page per family where **every operation appears in its four forms** — curl, CLI, SDK and MCP — all derived from the same `operationId`. That automatic parity *is* the proof of "API-first"; written by hand, three of the four would go stale at the first new endpoint.

It deploys to GitHub Pages on every push to `main` that touches `docs/` or the spec.

### CI gates

Two, and both exist for the same reason — so that "v1" means something:

1. **`sync:spec --check`** — the devkit cannot go stale relative to the API without the build turning red. Without this, this copy of the spec ages in silence and the published SDK stops describing the published contract.
2. **`gen:check`** — nobody hand-edits a generated file, and nobody updates the spec without regenerating.

## Contract and stability

The API is **v1** with a **twelve-month deprecation policy**: nothing is removed or renamed without that notice, with `Deprecation`/`Sunset` headers on the affected responses and a changelog entry. Additive changes (new fields, new enum values, new endpoints) ship without notice, so **deserialize ignoring the unknown and always keep a `default` branch**.

The full policy: <https://docs.truo.cloud/deprecation>.

## License

MIT.
