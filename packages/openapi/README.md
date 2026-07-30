# `@truocloud/openapi`

The OpenAPI 3.1 document for `api.truo.cloud/v1`, exactly as the API serves it.

```bash
npm i @truocloud/openapi
```

```ts
import openapi, { eachOperation, API_VERSION } from "@truocloud/openapi";

console.log(API_VERSION);                    // "1.0.0"
for (const { path, method, op } of eachOperation()) {
  console.log(method.toUpperCase(), path, op["x-truo-scope"]);
}
```

Or the raw JSON, for tools that want it that way:

```ts
import spec from "@truocloud/openapi/v1.json" with { type: "json" };
```

## Why it exists as a package

So that the SDK, the CLI and third-party tools consume **exactly the same
document** as `GET /v1/openapi.json`. Any divergence between what the API
publishes and what a tool assumes is a bug, and keeping it in one place is what
makes it detectable with a diff.

The full chain is: handler → validation schema → spec → SDK/CLI. **No link is
written by hand.**

## `x-truo-*` extensions

Every operation declares what does not fit in standard OpenAPI:

| | |
|---|---|
| `x-truo-scope` | Required scope (`vps:write`) |
| `x-truo-danger` | `none` · `reversible` · `destructive` |
| `x-truo-long-running` | Returns `202` + an operation to wait for |
| `x-truo-idempotent` | Accepts `Idempotency-Key` |
| `x-truo-rate-bucket` | `read` · `write` · `expensive` |
| `x-truo-cli` | CLI command and positionals |
| `x-truo-mcp` | Toolset, action and whether it is read-only |

The `operationId` is **permanent contract**: it is the join key between the
SDK's methods, the CLI's commands, the MCP's actions and the documentation's
anchors.

---

Documentation: **[docs.truo.cloud](https://docs.truo.cloud)** ·
Code: [truocloud/truo-devkit](https://github.com/truocloud/truo-devkit) · MIT
