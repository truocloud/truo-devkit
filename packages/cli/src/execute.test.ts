/**
 * Tests del CLI sobre los comandos reales generados del spec.
 *
 * No se inventan `CommandSpec` de juguete: se buscan por nombre en `COMMANDS_BY_PATH`. Asi
 * el test tambien vigila el contrato — si un dia `truo vps power` deja de aceptar `stop`,
 * o si el generador cambia donde cae un argumento, esto se pone rojo.
 */
import { describe, expect, test } from "bun:test";
import { TruoClient } from "../../sdk/src/index.ts";
import { COMMANDS_BY_PATH } from "./generated/commands.ts";
import { executeCommand } from "./execute.ts";
import { parseArgs } from "./args.ts";
import { CliError, EXIT, type ExitCode } from "./exit.ts";
import { render, selectPath } from "./output.ts";

type Call = { url: string; init: RequestInit };

function harness(responses: Response[]) {
  const calls: Call[] = [];
  let i = 0;
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return responses[Math.min(i++, responses.length - 1)]!.clone();
  }) as unknown as typeof globalThis.fetch;
  return { calls, client: new TruoClient({ token: "tc_test_x", fetch: fetchImpl, maxRetries: 0 }) };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function run(commandPath: string, argv: string[], responses: Response[]) {
  const spec = COMMANDS_BY_PATH[commandPath];
  if (!spec) throw new Error(`El spec ya no define el comando "truo ${commandPath}".`);
  const { calls, client } = harness(responses);
  const args = parseArgs(argv);
  return {
    calls,
    promise: executeCommand(spec, { client, args, positionals: args.words }),
  };
}

describe("mapeo de argumentos", () => {
  test("un posicional del body viaja en el cuerpo, no en la URL", async () => {
    const { calls, promise } = run("vps power", ["svc_10432", "stop", "--no-wait"], [
      json({ object: "operation", id: "op_1", status: "running" }, 202),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls[0]!.url).toBe("https://api.truo.cloud/v1/vps/svc_10432/power");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ action: "stop" });
  });

  test("rechaza un valor fuera del enum antes de gastar una llamada", async () => {
    const { calls, promise } = run("vps power", ["svc_1", "explotar"], [json({})]);
    await expect(promise).rejects.toThrow(/no es un valor valido/);
    expect(calls).toHaveLength(0);
  });

  test("faltando un posicional, el error trae el uso", async () => {
    const { promise } = run("vps power", ["svc_1"], [json({})]);
    const err = (await promise.catch((e) => e)) as CliError;
    expect(err.code).toBe(EXIT.USAGE);
    expect(err.hint).toContain("truo vps power <service_id> <action>");
  });

  test("las flags de query van a la query string", async () => {
    const { calls, promise } = run("vps list", ["--limit", "3"], [
      json({ object: "list", data: [], has_more: false }),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls[0]!.url).toContain("limit=3");
  });

  test("--body-json se fusiona sobre las flags", async () => {
    const { calls, promise } = run("vps rename", ["svc_1", "--hostname", "a", "--body-json", '{"hostname":"b"}'], [
      json({ object: "vps", id: "svc_1" }),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ hostname: "b" });
  });
});

describe("operaciones destructivas", () => {
  test("sin --yes y sin TTY no se ejecuta nada", async () => {
    const { calls, promise } = run("vps backup delete", ["svc_1", "bk_1"], [json(null, 204)]);
    const err = (await promise.catch((e) => e)) as CliError;
    expect(err.code).toBe(EXIT.ABORTED);
    expect(calls).toHaveLength(0);
  });

  test("con --yes se ejecuta", async () => {
    const { calls, promise } = run("vps backup delete", ["svc_1", "bk_1", "--yes"], [json(null, 204)]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls[0]!.init.method).toBe("DELETE");
  });
});

describe("operaciones asincronas", () => {
  test("espera por defecto hasta que la operacion termina", async () => {
    const { calls, promise } = run("vps power", ["svc_1", "stop"], [
      json({ object: "operation", id: "op_1", type: "vps.power", status: "running" }, 202),
      json({ object: "operation", id: "op_1", type: "vps.power", status: "succeeded" }),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[1]!.url).toContain("/v1/operations/op_1");
  });

  test("--no-wait devuelve la operacion sin hacer polling", async () => {
    const { calls, promise } = run("vps power", ["svc_1", "stop", "--no-wait"], [
      json({ object: "operation", id: "op_1", status: "running" }, 202),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls).toHaveLength(1);
  });
});

describe("errores de la API traducidos a codigos de salida", () => {
  const cases: [number, string, ExitCode][] = [
    [401, "authentication_error", EXIT.UNAUTHENTICATED],
    [403, "authorization_error", EXIT.FORBIDDEN],
    [404, "invalid_request_error", EXIT.NOT_FOUND],
    [409, "invalid_request_error", EXIT.CONFLICT],
    [429, "rate_limit_error", EXIT.RATE_LIMITED],
    [503, "api_error", EXIT.API_ERROR],
  ];

  for (const [status, type, expected] of cases) {
    test(`${status} → exit ${expected}`, async () => {
      const { promise } = run("vps get", ["svc_1"], [json({ error: { type, code: "x", message: "no" } }, status)]);
      const err = (await promise.catch((e) => e)) as CliError;
      expect(err.code).toBe(expected);
    });
  }

  test("un 403 por scope explica que hacer", async () => {
    const { promise } = run("vps get", ["svc_1"], [
      json({ error: { type: "authorization_error", code: "insufficient_scope", message: "falta vps:read" } }, 403),
    ]);
    const err = (await promise.catch((e) => e)) as CliError;
    expect(err.hint).toContain("scope");
  });
});

describe("salida", () => {
  const list = {
    object: "list",
    data: [
      { object: "vps", id: "svc_1", hostname: "web-01", state: "running" },
      { object: "vps", id: "svc_2", hostname: null, state: "stopped" },
    ],
    has_more: false,
  };

  test("-o id escupe una columna lista para xargs", () => {
    expect(render(list, { format: "id" })).toBe("svc_1\nsvc_2");
  });

  test("-o json desenvuelve la coleccion", () => {
    expect(JSON.parse(render(list, { format: "json" }))).toHaveLength(2);
  });

  test("-o jsonl da una linea por elemento", () => {
    expect(render(list, { format: "jsonl" }).split("\n")).toHaveLength(2);
  });

  test("la tabla ordena las columnas por relevancia, no por el JSON", () => {
    const header = render(list, { format: "table" }).split("\n")[0]!;
    expect(header.indexOf("ID")).toBeLessThan(header.indexOf("HOSTNAME"));
    expect(header).not.toContain("OBJECT");
  });

  test("--field recorta por ruta con puntos", () => {
    expect(selectPath(list, "data.0.hostname")).toBe("web-01");
    expect(selectPath(list, "data.9.hostname")).toBeUndefined();
  });
});

describe("parser de argumentos", () => {
  test("--no-x niega, --x=y asigna, repetir acumula", () => {
    const a = parseArgs(["vps", "list", "--no-wait", "--limit=5", "--tag", "a", "--tag", "b"]);
    expect(a.words).toEqual(["vps", "list"]);
    expect(a.flags.get("wait")).toBe(false);
    expect(a.flags.get("limit")).toBe("5");
    expect(a.flags.get("tag")).toEqual(["a", "b"]);
  });

  test("lo que va despues de -- no se interpreta", () => {
    const a = parseArgs(["vps", "ssh", "svc_1", "--", "-p", "2222"]);
    expect(a.passthrough).toEqual(["-p", "2222"]);
    expect(a.flags.has("p")).toBe(false);
  });

  test("una flag corta desconocida falla en vez de ignorarse", () => {
    expect(() => parseArgs(["-Z"])).toThrow(/Flag desconocida/);
  });
});
