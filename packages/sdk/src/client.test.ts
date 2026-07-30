/**
 * Transport tests. They never touch the network: `fetch` is injected.
 *
 * What gets tested is exactly what the generated tree can NOT guarantee — that the URL is
 * built right, that a 429 is retried and a 400 is not, that idempotency shows up where it
 * should, and that pagination terminates.
 */
import { describe, expect, test } from "bun:test";
import { TruoClient } from "./client.ts";
import { AuthorizationError, RateLimitError, TruoError } from "./errors.ts";

type Call = { url: string; init: RequestInit };

/**
 * Each call consumes the next response and repeats the last one when they run out.
 *
 * A `clone()` is always returned: a `Response` body can be read only once, and a test
 * that retries or paginates asks for the same response twice. Without the clone the error
 * you see is "Body already used" — from the harness, not from the code.
 */
function stub(responses: (Response | (() => Response))[]) {
  const calls: Call[] = [];
  let i = 0;
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses[Math.min(i++, responses.length - 1)]!;
    return typeof next === "function" ? next() : next.clone();
  }) as unknown as typeof globalThis.fetch;
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "req_test", ...headers },
  });

function client(responses: (Response | (() => Response))[], opts: Record<string, unknown> = {}) {
  const { calls, fetchImpl } = stub(responses);
  return {
    calls,
    truo: new TruoClient({ token: "tc_test_abc", fetch: fetchImpl, maxRetries: 2, ...opts }),
  };
}

describe("request construction", () => {
  test("substitutes path parameters and builds the query string", async () => {
    const { truo, calls } = client([json({ object: "list", data: [], has_more: false })]);
    // `limit` goes as a string: that is how the contract declares it.
    await truo.vps.backups.list("svc_10432", { limit: "5" });
    expect(calls[0]!.url).toBe("https://api.truo.cloud/v1/vps/svc_10432/backups?limit=5");
    expect(calls[0]!.init.method).toBe("GET");
  });

  test("encodes path values instead of trusting the caller", async () => {
    const { truo, calls } = client([json({})]);
    await truo.dns.zones.get("my weird/domain.com");
    expect(calls[0]!.url).toContain("my%20weird%2Fdomain.com");
  });

  test("an empty path parameter fails before hitting the network", async () => {
    const { truo, calls } = client([json({})]);
    await expect(truo.vps.get("")).rejects.toThrow(TruoError);
    expect(calls).toHaveLength(0);
  });

  test("splits query params from request options", async () => {
    const { truo, calls } = client([json({ object: "list", data: [], has_more: false })]);
    await truo.services.list({ limit: "2", timeoutMs: 5_000 });
    expect(calls[0]!.url).toContain("limit=2");
    expect(calls[0]!.url).not.toContain("timeoutMs");
  });

  test("sends Bearer and does not let user headers override it", async () => {
    const { truo, calls } = client([json({})]);
    await truo.account.get({ headers: { Authorization: "Bearer stolen" } });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer tc_test_abc");
  });
});

describe("idempotency", () => {
  test("generates a key for mutations that accept one", async () => {
    const { truo, calls } = client([json({ object: "operation", id: "op_1", status: "running" }, 202)]);
    await truo.vps.power("svc_1", { action: "stop" });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["idempotency-key"]).toMatch(/^sdk_/);
  });

  test("honors the key the user passes", async () => {
    const { truo, calls } = client([json({ object: "operation", id: "op_1", status: "running" }, 202)]);
    await truo.vps.power("svc_1", { action: "stop" }, { idempotencyKey: "deploy-42" });
    expect((calls[0]!.init.headers as Record<string, string>)["idempotency-key"]).toBe("deploy-42");
  });

  test("a GET carries no idempotency key", async () => {
    const { truo, calls } = client([json({})]);
    await truo.vps.get("svc_1");
    expect((calls[0]!.init.headers as Record<string, string>)["idempotency-key"]).toBeUndefined();
  });
});

describe("retries", () => {
  test("retries a 429 and honors Retry-After", async () => {
    const { truo, calls } = client([
      json({ error: { type: "rate_limit_error", code: "rate_limited" } }, 429, { "retry-after": "0" }),
      json({ object: "vps", id: "svc_1" }),
    ]);
    const vps = await truo.vps.get("svc_1");
    expect(calls).toHaveLength(2);
    expect(vps.id).toBe("svc_1");
  });

  test("does not retry a 403: retrying a missing permission never earns it", async () => {
    const { truo, calls } = client([
      json({ error: { type: "authorization_error", code: "insufficient_scope", message: "missing vps:write" } }, 403),
    ]);
    await expect(truo.vps.get("svc_1")).rejects.toBeInstanceOf(AuthorizationError);
    expect(calls).toHaveLength(1);
  });

  test("with retries exhausted, propagates the last typed error", async () => {
    const { truo, calls } = client([
      json({ error: { type: "rate_limit_error", code: "rate_limited" } }, 429, { "retry-after": "0" }),
    ]);
    const err = (await truo.vps.get("svc_1").catch((e) => e)) as RateLimitError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.code).toBe("rate_limited");
    expect(err.requestId).toBe("req_test");
    expect(calls).toHaveLength(3); // 1 attempt + 2 retries
  });

  test("a 502 with proxy HTML does not break parsing", async () => {
    const { truo } = client([
      new Response("<html>502 Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } }),
    ]);
    const err = (await truo.vps.get("svc_1").catch((e) => e)) as TruoError;
    expect(err.status).toBe(502);
    expect(err.message).toContain("502");
  });
});

describe("pagination", () => {
  test("follows the cursor until the collection is exhausted", async () => {
    const { truo, calls } = client([
      json({ object: "list", data: [{ id: "svc_1" }], has_more: true, next_cursor: "c2" }),
      json({ object: "list", data: [{ id: "svc_2" }], has_more: false, next_cursor: null }),
    ]);
    const ids: string[] = [];
    for await (const svc of truo.services.listAll()) ids.push(svc.id);
    expect(ids).toEqual(["svc_1", "svc_2"]);
    expect(calls[1]!.url).toContain("cursor=c2");
  });

  test("stops if the server returns the same cursor twice", async () => {
    const { truo } = client([json({ object: "list", data: [{ id: "a" }], has_more: true, next_cursor: "same" })]);
    const run = async () => {
      for await (const _ of truo.services.listAll()) void _;
    };
    await expect(run()).rejects.toThrow(/same cursor/);
  });
});

describe("operations.wait", () => {
  test("polls until succeeded", async () => {
    const { truo, calls } = client([
      json({ object: "operation", id: "op_1", type: "vps.power", status: "running", progress: 40 }),
      json({ object: "operation", id: "op_1", type: "vps.power", status: "succeeded", progress: 100 }),
    ]);
    const seen: number[] = [];
    const op = await truo.operations.wait("op_1", {
      intervalMs: 1,
      onProgress: (o) => seen.push(o.progress ?? -1),
    });
    expect(op.status).toBe("succeeded");
    expect(seen).toEqual([40, 100]);
    expect(calls).toHaveLength(2);
  });

  test("a failed operation raises OperationFailedError with the id", async () => {
    const { truo } = client([
      json({ object: "operation", id: "op_9", type: "vps.reinstall", status: "failed", error: { message: "out of space" } }),
    ]);
    const err = (await truo.operations.wait("op_9", { intervalMs: 1 }).catch((e) => e)) as Error & {
      operationId: string;
    };
    expect(err.operationId).toBe("op_9");
    expect(err.message).toContain("out of space");
  });

  test("on timeout it says how to resume instead of declaring the operation lost", async () => {
    const { truo } = client([json({ object: "operation", id: "op_5", type: "x", status: "running" })]);
    const err = (await truo.operations.wait("op_5", { timeoutMs: 5, intervalMs: 1 }).catch((e) => e)) as Error;
    expect(err.message).toContain('operations.wait("op_5")');
  });
});

describe("deprecation", () => {
  test("warns only once per operation", async () => {
    const notices: string[] = [];
    const { truo } = client(
      [
        () =>
          json({ object: "vps", id: "svc_1" }, 200, {
            deprecation: "Sun, 27 Jul 2026 00:00:00 GMT",
            sunset: "Tue, 27 Jul 2027 00:00:00 GMT",
            link: '<https://docs.truo.cloud/changelog/x>; rel="deprecation"',
          }),
      ],
      { onDeprecation: (i: unknown) => notices.push((i as { link: string }).link) },
    );
    await truo.vps.get("svc_1");
    await truo.vps.get("svc_1");
    expect(notices).toEqual(["https://docs.truo.cloud/changelog/x"]);
  });
});

describe("credentials", () => {
  test("without a token the client is not constructed", () => {
    const prev = process.env["TRUO_TOKEN"];
    delete process.env["TRUO_TOKEN"];
    expect(() => new TruoClient()).toThrow(/TRUO_TOKEN/);
    if (prev) process.env["TRUO_TOKEN"] = prev;
  });
});
