/**
 * The MCP server behind `truo mcp serve`.
 *
 * Every security property is enforced HERE, in code — never in a prompt:
 *
 * - Read-only by default; writes exist only if `--allow` put their scope on the table,
 *   and a write that is not exposed is invisible, not rejected (see catalog.ts).
 * - Destructive actions take two calls: the first returns a summary + HMAC token over
 *   the exact arguments; the second executes only if the token still matches them.
 * - Every result is scrubbed: credentials become `secret_ref`s a human redeems with
 *   `truo secret reveal`; strings arrive without ANSI/control/bidi tricks; log-like
 *   content travels inside a fixed untrusted-data envelope.
 * - No tool accepts an account identifier. The credential decides the tenant, always.
 */
import type { TruoClient } from "../../../sdk/src/index.ts";
import { OperationTimeoutError, TruoError } from "../../../sdk/src/index.ts";
import { OPERATION_LIST } from "../../../sdk/src/generated/operations.ts";
import type { JsonSchema } from "../../../openapi/src/index.ts";
import { buildCatalog, catalogFingerprint, type ExposedAction, type ExposedTool, type SessionOptions } from "./catalog.ts";
import { mintConfirmationToken, verifyConfirmationToken } from "./confirm.ts";
import { RPC, RpcError, type MethodHandler } from "./rpc.ts";
import { scrub, wrapUntrusted } from "./scrub.ts";

const PROTOCOL_VERSIONS = ["2024-11-05", "2025-03-26", "2025-06-18"];
const LATEST_PROTOCOL = "2025-06-18";

export interface McpSession extends SessionOptions {
  client: TruoClient;
  serverVersion: string;
  /** Documentation origin, injected for tests. */
  docsUrl?: string;
}

interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

const asResult = (value: unknown, isError = false): ToolResult => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

// ── Meta-tools (hand-written, backed by spec operations) ─────────────────────

interface MetaTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>, ctx: McpContext) => Promise<ToolResult>;
}

interface McpContext {
  session: McpSession;
  tools: Map<string, ExposedTool>;
  fingerprint: string;
}

const META_TOOLS: MetaTool[] = [
  {
    name: "truo_whoami",
    description:
      "Who am I: the account behind this credential, plus this session's exposure — " +
      "read-only or not, which scopes are allowed, which toolsets are visible, and the " +
      "catalog fingerprint. Call this first.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async run(_args, ctx) {
      const res = await ctx.session.client.request("account.get");
      const { value } = scrub(res.data);
      return asResult({
        account: value,
        session: {
          read_only: ctx.session.allow.length === 0,
          allowed_scopes: ctx.session.allow,
          toolsets: [...ctx.tools.values()].map((t) => t.toolset),
          catalog_fingerprint: ctx.fingerprint,
        },
      });
    },
  },
  {
    name: "truo_services",
    description:
      "List the services on this account. This is the router: every other tool needs a " +
      "service_id and this is where they come from. Optionally filter by family.",
    inputSchema: {
      type: "object",
      properties: {
        family: { type: "string", description: "Filter by family (e.g. vps, dbaas, caas)." },
        limit: { type: "number", description: "Page size, 1-100. Default 25." },
        cursor: { type: "string", description: "Opaque cursor from a previous page." },
      },
      additionalProperties: false,
    },
    async run(args, ctx) {
      const query: Record<string, unknown> = {};
      for (const key of ["family", "limit", "cursor"]) if (args[key] !== undefined) query[key] = args[key];
      const res = await ctx.session.client.request("services.list", {
        queryKeys: Object.keys(query),
        params: query,
      });
      return asResult(scrub(res.data).value);
    },
  },
  {
    name: "truo_operation",
    description:
      "Check an asynchronous operation (op_…) returned by a long-running action, " +
      "optionally waiting for it to finish (up to 50 s per call; call again to keep waiting).",
    inputSchema: {
      type: "object",
      properties: {
        operation_id: { type: "string", description: "The op_… id." },
        wait: { type: "boolean", description: "Wait for a terminal state (up to 50 s). Default false." },
      },
      required: ["operation_id"],
      additionalProperties: false,
    },
    async run(args, ctx) {
      const id = String(args.operation_id ?? "");
      if (args.wait === true) {
        try {
          const op = await ctx.session.client.operations.wait(id, { timeoutMs: 50_000 });
          return asResult(scrub(op).value);
        } catch (err) {
          if (err instanceof OperationTimeoutError) {
            const op = await ctx.session.client.request("operations.get", { path: { id } });
            return asResult({ note: "Still running. Call truo_operation again to keep waiting.", operation: scrub(op.data).value });
          }
          throw err;
        }
      }
      const res = await ctx.session.client.request("operations.get", { path: { id } });
      return asResult(scrub(res.data).value);
    },
  },
  {
    name: "truo_docs",
    description:
      "Search the API contract: find operations by keyword and get their exact " +
      "arguments. Use it before guessing a parameter name. Full docs: the openapi " +
      "resource and the documentation site.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords, e.g. 'firewall', 'restore backup', 'dns record'." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    async run(args, ctx) {
      const docsUrl = ctx.session.docsUrl ?? "https://docs.truo.cloud";
      const terms = String(args.query ?? "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      if (!terms.length) return asResult({ error: "Give me at least one keyword." }, true);
      const hits = OPERATION_LIST.filter((op) => {
        const haystack = `${op.id} ${op.summary} ${op.path}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      }).slice(0, 12);
      return asResult({
        results: hits.map((op) => ({
          operation: op.id,
          summary: op.summary,
          method: op.method.toUpperCase(),
          path: op.path,
          scope: op.scope,
          danger: op.danger,
          async: op.longRunning,
        })),
        docs: `${docsUrl}/reference/`,
        note: "Family tools expose these as actions; the action list in each tool description is authoritative for this session.",
      });
    },
  },
];

// ── Family tool dispatch ─────────────────────────────────────────────────────

class ToolInputError extends Error {}

function typeOk(value: unknown, schema: JsonSchema): boolean {
  const t = schema.type;
  if (!t) return true;
  switch (t) {
    case "string":
      return typeof value === "string";
    case "number":
    case "integer":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Validates `params` against the action's generated schema and splits it into
 * path/query/body. Unknown keys are an error that NAMES the valid ones — the model
 * self-corrects on the next call instead of guessing again.
 */
function buildRequest(action: ExposedAction, serviceId: string | undefined, params: Record<string, unknown>) {
  const path: Record<string, string> = {};
  const query: Record<string, unknown> = {};
  const body: Record<string, unknown> = {};

  const [firstPath, ...restPath] = action.pathParams;
  if (firstPath !== undefined) {
    if (!serviceId) throw new ToolInputError(`"${action.action}" needs service_id. List services with truo_services.`);
    path[firstPath] = serviceId;
  }

  const valid = new Set<string>([...restPath, ...action.queryParams.map((q) => q.name), ...Object.keys(action.bodySchema?.properties ?? {})]);
  const bodyProps = action.bodySchema?.properties ?? {};
  const requiredBody = new Set(action.bodySchema?.required ?? []);
  const queryByName = new Map(action.queryParams.map((q) => [q.name, q]));

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (restPath.includes(key)) {
      path[key] = String(value);
    } else if (queryByName.has(key)) {
      const q = queryByName.get(key)!;
      if (!typeOk(value, q.schema)) throw new ToolInputError(`params.${key}: expected ${q.schema.type}.`);
      if (q.schema.enum && !q.schema.enum.includes(value as never)) {
        throw new ToolInputError(`params.${key}: "${String(value)}" is not one of: ${q.schema.enum.join(", ")}.`);
      }
      query[key] = value;
    } else if (key in bodyProps) {
      const schema = bodyProps[key]!;
      if (!typeOk(value, schema)) throw new ToolInputError(`params.${key}: expected ${schema.type}.`);
      if (schema.enum && !schema.enum.includes(value as never)) {
        throw new ToolInputError(`params.${key}: "${String(value)}" is not one of: ${schema.enum.join(", ")}.`);
      }
      body[key] = value;
    } else {
      throw new ToolInputError(
        `params.${key} is not an argument of "${action.action}". Valid: ${[...valid].join(", ") || "(none)"}.`,
      );
    }
  }

  for (const name of restPath) {
    if (!(name in path)) throw new ToolInputError(`"${action.action}" needs params.${name}.`);
  }
  for (const q of action.queryParams) {
    if (q.required && !(q.name in query)) throw new ToolInputError(`"${action.action}" needs params.${q.name}.`);
  }
  for (const name of requiredBody) {
    if (!(name in body)) throw new ToolInputError(`"${action.action}" needs params.${name}.`);
  }
  if (action.bodyRequired && Object.keys(bodyProps).length === 0) {
    // Free-form body: pass params through as-is (minus what path/query consumed).
    for (const [key, value] of Object.entries(params)) {
      if (!(key in path) && !(key in query)) body[key] = value;
    }
  }

  return { path, query, body: Object.keys(body).length ? body : undefined };
}

async function callFamilyTool(tool: ExposedTool, rawArgs: Record<string, unknown>, ctx: McpContext): Promise<ToolResult> {
  const actionName = String(rawArgs.action ?? "");
  const action = tool.actions.get(actionName);
  if (!action) {
    return asResult(
      { error: `Unknown action "${actionName}" for ${tool.name}.`, available: [...tool.actions.keys()] },
      true,
    );
  }

  const serviceId = rawArgs.service_id !== undefined ? String(rawArgs.service_id) : undefined;
  const params = (rawArgs.params ?? {}) as Record<string, unknown>;
  if (typeof params !== "object" || Array.isArray(params)) {
    return asResult({ error: "params must be an object." }, true);
  }

  let request;
  try {
    request = buildRequest(action, serviceId, params);
  } catch (err) {
    if (err instanceof ToolInputError) return asResult({ error: err.message }, true);
    throw err;
  }

  // The confirmation covers exactly what will run: tool, action, target and params.
  if (action.danger === "destructive") {
    const fingerprintArgs = { tool: tool.name, action: actionName, service_id: serviceId ?? null, params };
    const token = rawArgs.confirmation_token;
    if (typeof token !== "string" || token.length === 0) {
      return asResult({
        status: "confirmation_required",
        summary:
          `${action.summary} (${actionName})` +
          (serviceId ? ` on ${serviceId}` : "") +
          ". This is DESTRUCTIVE and cannot be undone.",
        instructions:
          "Show the summary to the human and ask for explicit approval. Only after they approve, " +
          "call this tool again with the same arguments plus this confirmation_token.",
        confirmation_token: mintConfirmationToken(fingerprintArgs),
        expires_in_seconds: 300,
      });
    }
    const verdict = verifyConfirmationToken(token, fingerprintArgs);
    if (!verdict.ok) {
      return asResult(
        {
          error:
            verdict.reason === "expired"
              ? "The confirmation expired. Start over: call without confirmation_token to get a fresh one."
              : "The confirmation token does not match these arguments. A confirmation only covers the exact " +
                "arguments it was issued for — call without confirmation_token to get one for these.",
        },
        true,
      );
    }
  }

  let data: unknown;
  try {
    const res = await ctx.session.client.request(action.operationId, {
      path: request.path,
      body: request.body,
      queryKeys: Object.keys(request.query),
      params: request.query,
    });
    data = res.data;
  } catch (err) {
    if (err instanceof TruoError) {
      return asResult(
        {
          error: err.message,
          code: err.code,
          ...(err.status === 404
            ? { note: "Either it does not exist or this credential cannot see it; the API does not distinguish the two." }
            : {}),
          ...(err.requestId ? { request_id: err.requestId } : {}),
        },
        true,
      );
    }
    throw err;
  }

  // Long-running: wait a bounded slice so short operations come back finished, and
  // hand longer ones to truo_operation instead of stalling the tool call.
  const op = data as { object?: string; id?: string; status?: string } | null;
  if (action.longRunning && op?.object === "operation" && op.id && op.status !== "succeeded" && op.status !== "failed") {
    try {
      data = await ctx.session.client.operations.wait(op.id, { timeoutMs: 45_000 });
    } catch (err) {
      if (err instanceof OperationTimeoutError) {
        return asResult({
          note: `Still running. Poll it with truo_operation { operation_id: "${op.id}", wait: true }.`,
          operation: scrub(data).value,
        });
      }
      if (err instanceof TruoError) return asResult({ error: err.message, code: err.code }, true);
      throw err;
    }
  }

  const { value, refs } = scrub(data);

  // Log-like content is attacker-writable free text: it travels in the untrusted
  // envelope, capped, instead of as naked JSON the model might "obey".
  if (/logs?($|_)/.test(actionName)) {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    const wrapped = wrapUntrusted(text, `${tool.toolset}:${actionName}`);
    return asResult(wrapped.truncated ? `${wrapped.text}\n[truncated at 32 KB]` : wrapped.text);
  }

  if (refs.length) {
    return asResult({
      result: value,
      secret_refs: refs,
      note:
        "Credentials were replaced by secret_ref values. They are NOT retrievable by you: " +
        "a human runs `truo secret reveal <ref>` on this machine within 15 minutes.",
    });
  }
  return asResult(value);
}

// ── Prompts & resources ──────────────────────────────────────────────────────

const PROMPTS = [
  {
    name: "incident_triage",
    description: "Read-only triage of a service that looks down or degraded.",
    text:
      "Triage an incident on my TruoCloud account, strictly read-only. Steps: " +
      "1) truo_whoami, 2) truo_services to locate the affected service, 3) status/metrics/logs " +
      "actions for its family. Do NOT restart, redeploy or change anything — propose actions " +
      "and let me run them. Summarize: what is failing, since when, most likely cause, next step.",
  },
  {
    name: "provision_stack",
    description: "Plan (and, with approval, execute) the provisioning of a small app stack.",
    text:
      "Help me provision a stack on TruoCloud. First inspect what I already have " +
      "(truo_whoami, truo_services), then propose a concrete plan: which services, which " +
      "actions, in what order, and what each step costs in blast radius. Wait for my OK " +
      "before any write action; destructive ones will ask for confirmation anyway.",
  },
];

// ── Wiring ───────────────────────────────────────────────────────────────────

/** The meta-tools' surface, so `truo mcp inspect` fingerprints the same catalog `serve` does. */
export function metaToolSurface(): { name: string; description: string; inputSchema: unknown }[] {
  return META_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
}

export function createMcpHandlers(session: McpSession): { handlers: Record<string, MethodHandler>; context: McpContext } {
  const tools = buildCatalog(session);
  const fingerprint = catalogFingerprint(
    tools,
    META_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  );
  const context: McpContext = { session, tools, fingerprint };

  const listTools = () => ({
    tools: [
      ...META_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      ...[...tools.values()].map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
    ],
  });

  const handlers: Record<string, MethodHandler> = {
    initialize: (params) => {
      const requested = (params as { protocolVersion?: string } | undefined)?.protocolVersion;
      return {
        protocolVersion: requested && PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL,
        capabilities: { tools: { listChanged: false }, resources: {}, prompts: {} },
        serverInfo: { name: "truo", version: session.serverVersion },
        instructions:
          "TruoCloud infrastructure for this account. Start with truo_whoami, find service ids with " +
          "truo_services. This session is " +
          (session.allow.length ? `allowed to write within: ${session.allow.join(", ")}.` : "READ-ONLY.") +
          " Destructive actions require a human-approved confirmation_token. Credentials never appear " +
          "in results; they come back as secret_ref values only a human can redeem.",
      };
    },
    "notifications/initialized": () => undefined,
    ping: () => ({}),

    "tools/list": listTools,

    "tools/call": async (params) => {
      const p = params as { name?: string; arguments?: Record<string, unknown> };
      const name = p?.name ?? "";
      const args = p?.arguments ?? {};
      const meta = META_TOOLS.find((t) => t.name === name);
      try {
        if (meta) return await meta.run(args, context);
        const tool = tools.get(name);
        if (!tool) throw new RpcError(RPC.INVALID_PARAMS, `Unknown tool: ${name}`);
        return await callFamilyTool(tool, args, context);
      } catch (err) {
        if (err instanceof RpcError) throw err;
        if (err instanceof TruoError) return asResult({ error: err.message, code: err.code }, true);
        throw new RpcError(RPC.INTERNAL, err instanceof Error ? err.message : String(err));
      }
    },

    "resources/list": () => ({
      resources: [
        {
          uri: "truo://openapi/v1",
          name: "TruoCloud API v1 OpenAPI document",
          description: "The full machine-readable contract, fetched live.",
          mimeType: "application/json",
        },
        {
          uri: "truo://account/services",
          name: "Services on this account",
          description: "First page of services, all families.",
          mimeType: "application/json",
        },
      ],
    }),

    "resources/read": async (params) => {
      const uri = (params as { uri?: string } | undefined)?.uri ?? "";
      if (uri === "truo://openapi/v1") {
        // The spec is served as a plain document, not as an operation of itself.
        const res = await fetch(`${session.client.baseUrl}/v1/openapi.json`);
        if (!res.ok) throw new RpcError(RPC.INTERNAL, `Could not fetch the spec (${res.status}).`);
        return { contents: [{ uri, mimeType: "application/json", text: await res.text() }] };
      }
      if (uri === "truo://account/services") {
        const res = await session.client.request("services.list", { queryKeys: ["limit"], params: { limit: 100 } });
        return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(scrub(res.data).value) }] };
      }
      throw new RpcError(RPC.INVALID_PARAMS, `Unknown resource: ${uri}`);
    },

    "prompts/list": () => ({
      prompts: PROMPTS.map((p) => ({ name: p.name, description: p.description })),
    }),

    "prompts/get": (params) => {
      const name = (params as { name?: string } | undefined)?.name ?? "";
      const prompt = PROMPTS.find((p) => p.name === name);
      if (!prompt) throw new RpcError(RPC.INVALID_PARAMS, `Unknown prompt: ${name}`);
      return {
        description: prompt.description,
        messages: [{ role: "user", content: { type: "text", text: prompt.text } }],
      };
    },
  };

  return { handlers, context };
}
