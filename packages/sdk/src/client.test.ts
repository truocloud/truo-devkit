/**
 * Tests del transporte. No tocan la red: `fetch` se inyecta.
 *
 * Lo que se prueba es exactamente lo que el arbol generado NO puede garantizar — que la
 * URL se arme bien, que un 429 se reintente y un 400 no, que la idempotencia aparezca
 * donde corresponde y que la paginacion termine.
 */
import { describe, expect, test } from "bun:test";
import { TruoClient } from "./client.ts";
import { AuthorizationError, RateLimitError, TruoError } from "./errors.ts";

type Call = { url: string; init: RequestInit };

/**
 * Cada llamada consume la siguiente respuesta y repite la ultima cuando se acaban.
 *
 * Se devuelve un `clone()` siempre: el body de un `Response` se lee una sola vez, y un
 * test que reintenta o pagina pide la misma respuesta dos veces. Sin el clone el error que
 * ves es "Body already used" — del arnes, no del codigo.
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

describe("construccion del request", () => {
  test("sustituye los parametros de ruta y arma el query", async () => {
    const { truo, calls } = client([json({ object: "list", data: [], has_more: false })]);
    // `limit` va como string: asi lo declara el contrato.
    await truo.vps.backups.list("svc_10432", { limit: "5" });
    expect(calls[0]!.url).toBe("https://api.truo.cloud/v1/vps/svc_10432/backups?limit=5");
    expect(calls[0]!.init.method).toBe("GET");
  });

  test("codifica los valores de ruta en vez de confiar en el llamador", async () => {
    const { truo, calls } = client([json({})]);
    await truo.dns.zones.get("mi dominio/raro.com");
    expect(calls[0]!.url).toContain("mi%20dominio%2Fraro.com");
  });

  test("un parametro de ruta vacio falla antes de salir a la red", async () => {
    const { truo, calls } = client([json({})]);
    await expect(truo.vps.get("")).rejects.toThrow(TruoError);
    expect(calls).toHaveLength(0);
  });

  test("separa los query params de las opciones de request", async () => {
    const { truo, calls } = client([json({ object: "list", data: [], has_more: false })]);
    await truo.services.list({ limit: "2", timeoutMs: 5_000 });
    expect(calls[0]!.url).toContain("limit=2");
    expect(calls[0]!.url).not.toContain("timeoutMs");
  });

  test("manda Bearer y no lo deja pisar por headers del usuario", async () => {
    const { truo, calls } = client([json({})]);
    await truo.account.get({ headers: { Authorization: "Bearer robado" } });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer tc_test_abc");
  });
});

describe("idempotencia", () => {
  test("genera una clave para las mutaciones que la aceptan", async () => {
    const { truo, calls } = client([json({ object: "operation", id: "op_1", status: "running" }, 202)]);
    await truo.vps.power("svc_1", { action: "stop" });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["idempotency-key"]).toMatch(/^sdk_/);
  });

  test("respeta la clave que pasa el usuario", async () => {
    const { truo, calls } = client([json({ object: "operation", id: "op_1", status: "running" }, 202)]);
    await truo.vps.power("svc_1", { action: "stop" }, { idempotencyKey: "deploy-42" });
    expect((calls[0]!.init.headers as Record<string, string>)["idempotency-key"]).toBe("deploy-42");
  });

  test("un GET no lleva clave de idempotencia", async () => {
    const { truo, calls } = client([json({})]);
    await truo.vps.get("svc_1");
    expect((calls[0]!.init.headers as Record<string, string>)["idempotency-key"]).toBeUndefined();
  });
});

describe("reintentos", () => {
  test("reintenta un 429 y respeta Retry-After", async () => {
    const { truo, calls } = client([
      json({ error: { type: "rate_limit_error", code: "rate_limited" } }, 429, { "retry-after": "0" }),
      json({ object: "vps", id: "svc_1" }),
    ]);
    const vps = await truo.vps.get("svc_1");
    expect(calls).toHaveLength(2);
    expect(vps.id).toBe("svc_1");
  });

  test("no reintenta un 403: reintentar un permiso que falta nunca lo consigue", async () => {
    const { truo, calls } = client([
      json({ error: { type: "authorization_error", code: "insufficient_scope", message: "falta vps:write" } }, 403),
    ]);
    await expect(truo.vps.get("svc_1")).rejects.toBeInstanceOf(AuthorizationError);
    expect(calls).toHaveLength(1);
  });

  test("agotados los reintentos, propaga el ultimo error tipado", async () => {
    const { truo, calls } = client([
      json({ error: { type: "rate_limit_error", code: "rate_limited" } }, 429, { "retry-after": "0" }),
    ]);
    const err = (await truo.vps.get("svc_1").catch((e) => e)) as RateLimitError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.code).toBe("rate_limited");
    expect(err.requestId).toBe("req_test");
    expect(calls).toHaveLength(3); // 1 intento + 2 reintentos
  });

  test("un 502 con HTML de proxy no rompe el parseo", async () => {
    const { truo } = client([
      new Response("<html>502 Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } }),
    ]);
    const err = (await truo.vps.get("svc_1").catch((e) => e)) as TruoError;
    expect(err.status).toBe(502);
    expect(err.message).toContain("502");
  });
});

describe("paginacion", () => {
  test("sigue el cursor hasta agotar la coleccion", async () => {
    const { truo, calls } = client([
      json({ object: "list", data: [{ id: "svc_1" }], has_more: true, next_cursor: "c2" }),
      json({ object: "list", data: [{ id: "svc_2" }], has_more: false, next_cursor: null }),
    ]);
    const ids: string[] = [];
    for await (const svc of truo.services.listAll()) ids.push(svc.id);
    expect(ids).toEqual(["svc_1", "svc_2"]);
    expect(calls[1]!.url).toContain("cursor=c2");
  });

  test("corta si el servidor devuelve el mismo cursor dos veces", async () => {
    const { truo } = client([json({ object: "list", data: [{ id: "a" }], has_more: true, next_cursor: "same" })]);
    const run = async () => {
      for await (const _ of truo.services.listAll()) void _;
    };
    await expect(run()).rejects.toThrow(/mismo cursor/);
  });
});

describe("operations.wait", () => {
  test("hace polling hasta succeeded", async () => {
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

  test("una operacion fallida levanta OperationFailedError con el id", async () => {
    const { truo } = client([
      json({ object: "operation", id: "op_9", type: "vps.reinstall", status: "failed", error: { message: "sin espacio" } }),
    ]);
    const err = (await truo.operations.wait("op_9", { intervalMs: 1 }).catch((e) => e)) as Error & {
      operationId: string;
    };
    expect(err.operationId).toBe("op_9");
    expect(err.message).toContain("sin espacio");
  });

  test("al vencer el plazo dice como retomar en vez de dar la operacion por perdida", async () => {
    const { truo } = client([json({ object: "operation", id: "op_5", type: "x", status: "running" })]);
    const err = (await truo.operations.wait("op_5", { timeoutMs: 5, intervalMs: 1 }).catch((e) => e)) as Error;
    expect(err.message).toContain('operations.wait("op_5")');
  });
});

describe("deprecacion", () => {
  test("avisa una sola vez por operacion", async () => {
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

describe("credenciales", () => {
  test("sin token no se construye el cliente", () => {
    const prev = process.env["TRUO_TOKEN"];
    delete process.env["TRUO_TOKEN"];
    expect(() => new TruoClient()).toThrow(/TRUO_TOKEN/);
    if (prev) process.env["TRUO_TOKEN"] = prev;
  });
});
