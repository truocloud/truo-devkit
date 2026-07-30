/**
 * Generates everything the docs must never write by hand, straight from the
 * OpenAPI document.
 *
 *   bun scripts/generate.ts
 *
 * Output:
 *   public/openapi.json                 the spec, for Scalar and anyone who wants it
 *   public/llms.txt / llms-full.txt     the catalog for agents
 *   src/content/docs/reference/*.mdx    one page per family, with the FOUR ways
 *                                       to call each operation
 *
 * **Why the four-way parity is generated.** The positioning says "API-first
 * and agent-ready". The proof of that isn't a paragraph: it's the same
 * operation appearing as curl, as a CLI command, as an SDK method, and as an
 * MCP action, all four derived from the same `operationId`. Written by hand,
 * three of the four would go stale on the first new endpoint.
 *
 * It reuses `packages/codegen/src/ir.ts` — the same IR the SDK and the CLI
 * are generated from — instead of reinterpreting the spec. If the CLI calls
 * something one way, the docs can't say another.
 */
import { mkdirSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildIR, type OpIR } from "../../packages/codegen/src/ir.ts";
import openapi from "../../packages/openapi/src/index.ts";

const DOCS = resolve(import.meta.dirname, "..");
const ROOT = resolve(DOCS, "..");
const PUBLIC = resolve(DOCS, "public");
const REFERENCE = resolve(DOCS, "src/content/docs/reference");

const BASE_URL = openapi.servers?.[0]?.url ?? "https://api.truo.cloud";

mkdirSync(PUBLIC, { recursive: true });
// Wiped whole: a family that disappears from the spec has to disappear from
// the docs, not linger as an orphan page documenting a 404.
rmSync(REFERENCE, { recursive: true, force: true });
mkdirSync(REFERENCE, { recursive: true });

// ── The spec ────────────────────────────────────────────────────────────────
copyFileSync(
  resolve(ROOT, "packages/openapi/openapi/v1.json"),
  resolve(PUBLIC, "openapi.json"),
);

const ops = buildIR();

// ── Helpers ─────────────────────────────────────────────────────────────────

function slug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** An example value for a path param, taken from the spec itself when it has one. */
function sample(op: OpIR, name: string): string {
  const param = op.pathParams.find((p) => p.name === name);
  const example = param?.schema.example;
  if (typeof example === "string" || typeof example === "number") return String(example);
  // Service ids are the majority and carry a typed prefix; everything else
  // falls back to an obvious placeholder so nobody copy-pastes it believing
  // it's real.
  return name === "id" ? "svc_10432" : `<${name}>`;
}

function curlFor(op: OpIR): string {
  let path = op.path;
  for (const p of op.pathParams) path = path.replace(`{${p.name}}`, sample(op, p.name));

  const lines = [`curl ${BASE_URL}${path} \\`];
  if (op.method !== "get") lines.push(`  -X ${op.method.toUpperCase()} \\`);
  lines.push(`  -H "Authorization: Bearer $TRUO_TOKEN"`);

  // A `-d '{}'` on an endpoint whose body is optional teaches people to send
  // an empty object as if it were required.
  const body = bodyExample(op);
  if (op.body && (op.body.required || body !== "{}")) {
    lines[lines.length - 1] += ` \\`;
    lines.push(`  -H "Content-Type: application/json" \\`);
    lines.push(`  -d '${body}'`);
  }
  return lines.join("\n");
}

/** An example body containing the required properties. */
function bodyExample(op: OpIR): string {
  const schema = op.body?.schema;
  const props = schema?.properties;
  if (!props) return "{}";
  const required = new Set(schema?.required ?? []);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!required.has(key)) continue;
    out[key] =
      value.example ??
      (value.enum?.[0] ??
        (value.type === "number" || value.type === "integer"
          ? 1
          : value.type === "boolean"
            ? true
            : value.type === "array"
              ? []
              : `<${key}>`));
  }
  return JSON.stringify(out);
}

function cliFor(op: OpIR): string | null {
  if (!op.cli) return null;
  // Positionals in `x-truo-cli` carry a user-facing label (`service_id`)
  // while path params are named as in the URL (`id`). They resolve **by
  // order**, same as in `gen-cli.ts`: matching them by name would leave a
  // literal `<service_id>` in the docs for half of the commands.
  const remaining = [...op.pathParams];
  const args = (op.cli.positional ?? []).map((label) => {
    const param = remaining.shift();
    return param ? sample(op, param.name) : `<${label}>`;
  });
  return `truo ${op.cli.command}${args.length ? " " + args.join(" ") : ""}`;
}

function sdkFor(op: OpIR): string {
  const chain = op.segments.join(".");
  const args: string[] = op.pathParams.map((p) => `"${sample(op, p.name)}"`);
  const body = bodyExample(op);
  if (op.body && (op.body.required || body !== "{}")) args.push(body);
  return `await truo.${chain}(${args.join(", ")});`;
}

function mcpFor(op: OpIR): string | null {
  if (!op.mcp) return null;
  const args: Record<string, unknown> = { action: op.mcp.action };
  for (const p of op.pathParams) args[p.jsName] = sample(op, p.name);
  return `truo_${op.mcp.toolset}(${JSON.stringify(args, null, 2)})`;
}

const DANGER_LABEL: Record<string, string> = {
  none: "no risk",
  reversible: "reversible",
  destructive: "**destructive** — cannot be undone",
};

// ── One page per family ─────────────────────────────────────────────────────

const byTag = new Map<string, OpIR[]>();
for (const op of ops) {
  const list = byTag.get(op.tag) ?? [];
  list.push(op);
  byTag.set(op.tag, list);
}

/**
 * Sidebar order: by how the API is used, not alphabetical.
 *
 * The first thing anyone needs is to know what they have (`Services`) and
 * with which credential (`Account`). Alphabetical would put `API Keys` and
 * `Audit` at the very top and `VPS` at the bottom — exactly backwards from
 * why people come here.
 */
const TAG_ORDER = [
  "Meta",
  "Account",
  "Services",
  "VPS",
  "DNS",
  "DBaaS",
  "CaaS",
  "Load Balancer",
  "Object Storage",
  "Mail Gateway",
  "Operations",
  "API Keys",
  "Audit",
];

const tags = [...byTag.keys()].sort((a, b) => {
  const ia = TAG_ORDER.indexOf(a);
  const ib = TAG_ORDER.indexOf(b);
  // A new tag nobody added to the list goes last, not first.
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
});
for (const [index, tag] of tags.entries()) {
  const list = byTag.get(tag)!.sort((a, b) => a.id.localeCompare(b.id));

  const sections = list.map((op) => {
    const badges = [
      `\`${op.method.toUpperCase()} ${op.path}\``,
      op.scope ? `scope \`${op.scope}\`` : null,
      op.danger !== "none" ? DANGER_LABEL[op.danger] : null,
      op.longRunning ? "asynchronous" : null,
      op.idempotent ? "idempotent" : null,
      op.deprecated ? "**deprecated**" : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const cli = cliFor(op);
    const mcp = mcpFor(op);

    // The tabs are the proof of "API-first": the same operation, all four
    // surfaces, every one derived from the same `operationId`.
    const tabs = [
      `<TabItem label="curl">\n\n\`\`\`bash\n${curlFor(op)}\n\`\`\`\n\n</TabItem>`,
      cli ? `<TabItem label="CLI">\n\n\`\`\`bash\n${cli}\n\`\`\`\n\n</TabItem>` : null,
      `<TabItem label="SDK">\n\n\`\`\`ts\n${sdkFor(op)}\n\`\`\`\n\n</TabItem>`,
      mcp ? `<TabItem label="MCP">\n\n\`\`\`js\n${mcp}\n\`\`\`\n\n</TabItem>` : null,
    ].filter(Boolean);

    return [
      `## ${op.summary || op.id}`,
      "",
      badges,
      "",
      op.description ? `${op.description}\n` : "",
      `<Tabs syncKey="surface">`,
      "",
      tabs.join("\n\n"),
      "",
      `</Tabs>`,
      "",
      `\`operationId\`: \`${op.id}\``,
      "",
    ].join("\n");
  });

  const page = `---
title: ${tag}
description: ${tag} operations in the TruoCloud public API.
sidebar:
  order: ${index + 1}
---

import { Tabs, TabItem } from "@astrojs/starlight/components";

:::note[Generated from the contract]
This page is generated from \`GET ${BASE_URL}/v1/openapi.json\`. The curl, CLI,
SDK, and MCP examples are derived from the same \`operationId\`, so they can't
contradict each other. To try calls against your own account, use the
[API playground](/api/).
:::

${sections.join("\n")}`;

  // `.mdx`, not `.md`: in plain Markdown the `import` renders as literal text
  // and the `<Tabs>` end up as inert HTML. That's exactly what happened the
  // first time — the page looked fine in the diff, and the four surfaces
  // never rendered on the published site.
  writeFileSync(resolve(REFERENCE, `${slug(tag)}.mdx`), page.replace(/\r\n/g, "\n"), "utf8");
}

// ── llms.txt ────────────────────────────────────────────────────────────────
// An agent that lands on this without ever having read our docs must be able
// to assemble a correct call from what's in here.

const llms = `# TruoCloud

> Public API for operating cloud infrastructure: VPS, DNS, managed databases,
> containers, load balancers, Object Storage, and Mail Gateway.

Base: ${BASE_URL}/v1 · OpenAPI: ${BASE_URL}/v1/openapi.json
Authentication: \`Authorization: Bearer tc_live_...\` (API key with scopes).

## How to read responses
- Resource: \`{ "object": "vps", "id": "svc_10432", ... }\` — no envelope.
- Collection: \`{ "object": "list", "data": [...], "has_more": true, "next_cursor": "..." }\`.
  The cursor is **opaque**: do not construct or parse it.
- Error (any >=400): \`{ "error": { "type", "code", "message", "param", "request_id" } }\`.
  Branch on \`code\`, never on the text of \`message\`.
- Anything slow returns \`202\` + an \`operation\` object: poll \`/v1/operations/{id}\`
  until \`succeeded\` or \`failed\`.

## Rules
- Every mutation accepts \`Idempotency-Key\`. Use it: a retry without one creates twice.
- A service that doesn't exist **or that your credential can't see** returns 404, never 403.
  A 403 would confirm it exists.
- Ids carry a typed prefix (\`svc_10432\`). The bare number is accepted; the prefixed form is returned.

## Documentation
- [Introduction](https://docs.truo.cloud/)
- [Authentication](https://docs.truo.cloud/getting-started/authentication/)
- [The API contract](https://docs.truo.cloud/getting-started/api-contract/)
- [Errors](https://docs.truo.cloud/errors/)
- [Rate limits](https://docs.truo.cloud/rate-limits/)
- [Deprecation policy](https://docs.truo.cloud/deprecation/)
- [For AI agents](https://docs.truo.cloud/ai-agents/)

## Operations (${ops.length})
${tags
  .map(
    (tag) =>
      `\n### ${tag}\n` +
      byTag
        .get(tag)!
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(
          (op) =>
            `- \`${op.id}\` — ${op.method.toUpperCase()} ${op.path}${op.scope ? ` (scope \`${op.scope}\`)` : ""}${
              op.danger === "destructive" ? " ⚠️ destructive" : ""
            }${op.longRunning ? " · asynchronous" : ""}: ${op.summary}`,
        )
        .join("\n"),
  )
  .join("\n")}
`;

writeFileSync(resolve(PUBLIC, "llms.txt"), llms, "utf8");

// The long version adds each operation's parameters and body: it's what keeps
// an agent from inventing field names.
const full =
  llms +
  `\n---\n\n# Details for every operation\n` +
  ops
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((op) => {
      const params = [...op.pathParams, ...op.queryParams];
      return [
        `\n## ${op.id}`,
        `${op.method.toUpperCase()} ${op.path} → ${op.successStatus}`,
        op.summary,
        op.description || "",
        op.scope ? `Scope: \`${op.scope}\`` : "",
        params.length
          ? `Parameters:\n${params
              .map(
                (p) =>
                  `- \`${p.name}\`${p.required ? " (required)" : ""}: ${p.schema.type ?? "string"}${
                    p.schema.enum ? ` — one of ${p.schema.enum.map((v) => `\`${String(v)}\``).join(", ")}` : ""
                  }${p.description ? ` — ${p.description}` : ""}`,
              )
              .join("\n")}`
          : "",
        op.body
          ? `Body:\n\`\`\`json\n${JSON.stringify(op.body.schema.properties ?? {}, null, 2)}\n\`\`\``
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

writeFileSync(resolve(PUBLIC, "llms-full.txt"), full, "utf8");

console.log(`openapi.json + llms.txt + llms-full.txt`);
console.log(`${tags.length} reference pages (${ops.length} operations)`);
