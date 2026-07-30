---
title: Giving an agent access
description: How to scope a credential for an AI agent, what x-truo-danger means, and what the contract provides so a model doesn't invent parameters.
---

The API is built so an agent can operate it **without being handed the whole
account**. This page is what you need to know before connecting one.

## The MCP server

The CLI ships an MCP server over stdio. Register it with your client:

```bash
truo mcp install claude        # Claude Desktop
truo mcp install claude-code   # prints the `claude mcp add` command
truo mcp install cursor        # ~/.cursor/mcp.json
truo mcp install vscode        # .vscode/mcp.json (workspace)
```

Or run it directly: `truo mcp serve`. Auth is your CLI profile — the token
never enters the MCP client's config file. What the model gets is **one tool
per product family** (`truo_vps`, `truo_dns`, …) dispatched by `action`, plus
four meta-tools: `truo_whoami`, `truo_services`, `truo_operation` and
`truo_docs`. Families your account doesn't have are not shown at all.

The security model is enforced in the server, never in a prompt:

- **Read-only by default.** Write actions are *omitted from the catalog*
  unless you start the server with `--allow vps:write,dns:write`. What a
  model cannot name, a prompt injection cannot request. `--allow '*'` is
  rejected on purpose.
- **Destructive actions take two calls.** The first returns a summary and a
  `confirmation_token` — an HMAC over the exact arguments, 5-minute TTL.
  Changing any argument invalidates it, so a confirmation obtained for
  something small can't authorize something big.
- **Credentials never reach the model.** Secrets in results are replaced by
  single-use `secret_ref` values that only a human can redeem, on the same
  machine, with `truo secret reveal sr_…`.
- **Logs travel marked as data.** Attacker-writable content (container logs
  and the like) is stripped of ANSI/control/bidi tricks and wrapped in an
  untrusted-data envelope, capped at 32 KB.
- **No tool accepts an account id.** The credential decides the tenant,
  always — and the build fails if the spec ever tries to expose one.

`truo mcp inspect --allow vps:write` prints exactly what a session would
expose, with a **catalog fingerprint** you can pin: if the surface changes,
the fingerprint changes.

## One credential per agent, scoped down

Never reuse your CI key or your Terraform key.

```bash
truo auth token create \
  --name "support-agent" \
  --scopes services:read,vps:read,vps:power,operations:read \
  --service-allowlist svc_10432,svc_10433
```

Two independent limits:

- **Scopes** — what it can do. Start with `:read` only and add the rest when
  it's genuinely needed.
- **Service allowlist** — what it can touch. A key restricted to three
  services **cannot enumerate** the rest of the account: collection endpoints
  filter, they don't just block.

And one limit that can't be turned off: `apikeys:*` and `users:*` are **not
grantable to a key**. An agent holding an API key cannot mint another
credential or create a user, no matter what it's asked to do. See
[authentication](/getting-started/authentication/).

## What the contract tells the agent

Every operation in the spec declares how much a mistake hurts:

```yaml
x-truo-scope: vps:write
x-truo-danger: destructive      # none | reversible | destructive
x-truo-long-running: true
x-truo-idempotent: true
x-truo-mcp: { toolset: vps, action: reinstall, readonly: false }
```

`x-truo-danger` is what you should use to decide **where to require human
confirmation**. The CLI asks first on everything marked `destructive`, and
the MCP server requires its confirmation token for exactly the same set. One
taxonomy for both surfaces.

**Enforce the gate in your code, not in the prompt.** A prompt that says "ask
before deleting" is a suggestion; an `if (danger === "destructive")` is a
control.

## So it doesn't invent parameters

- **[`llms.txt`](https://docs.truo.cloud/llms.txt)** — the full catalog: every
  `operationId` with its method, path, scope, and whether it's destructive.
- **[`llms-full.txt`](https://docs.truo.cloud/llms-full.txt)** — the same plus
  the parameters and body of every operation. It's what keeps a model from
  making up field names.
- **[`openapi.json`](https://api.truo.cloud/v1/openapi.json)** — the entire
  contract, if your agent can read it.

Handing these to the agent cuts parameter hallucinations more than any
instruction in the prompt.

## Five things to handle in code

1. **Anything slow returns `202` plus an operation.** The agent has to poll
   `/v1/operations/{id}` until `succeeded` or `failed`, not assume the call
   finished the job.
2. **Send `Idempotency-Key` on every mutation.** An agent retries more than a
   human does, and without the key a retry creates two backups.
3. **404 doesn't mean "doesn't exist"** — it means "doesn't exist *for this
   credential*". If the agent expected to see something, the problem may be
   the allowlist, not the infrastructure.
4. **Data the API returns can come from an attacker.** Container logs, object
   listings, and WHOIS records are writable by third parties. Wrap them as
   data, not as instructions, before handing them to the model.
5. **No response should carry credentials to the model.** Endpoints that
   reveal secrets sit behind their own scopes (`dbaas:credentials`,
   `objectstorage:keys`) precisely so you can withhold them.

## A minimal example

```ts
import { TruoClient, OPERATIONS } from "@truocloud/sdk";

const truo = new TruoClient({ token: process.env.AGENT_TOKEN });

async function execute(operationId: string, args: Record<string, unknown>) {
  const meta = OPERATIONS[operationId as keyof typeof OPERATIONS];
  if (!meta) throw new Error(`unknown operation: ${operationId}`);

  // The gate lives here, not in the prompt.
  if (meta.danger === "destructive" && !(await askHumanConfirmation(meta, args))) {
    return { status: "cancelled" };
  }

  const res = await truo.request(operationId, { params: args });
  // If it's asynchronous, waiting for it is part of "execute", not of the prompt.
  return meta.longRunning
    ? await truo.operations.wait((res.data as { id: string }).id)
    : res.data;
}
```
