/**
 * CLI tests over the real commands generated from the spec.
 *
 * No toy `CommandSpec`s are invented: they are looked up by name in `COMMANDS_BY_PATH`.
 * That way the test also watches the contract — if one day `truo vps power` stops
 * accepting `stop`, or the generator changes where an argument lands, this goes red.
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
  if (!spec) throw new Error(`The spec no longer defines the command "truo ${commandPath}".`);
  const { calls, client } = harness(responses);
  const args = parseArgs(argv);
  return {
    calls,
    promise: executeCommand(spec, { client, args, positionals: args.words }),
  };
}

describe("argument mapping", () => {
  test("a body positional travels in the body, not in the URL", async () => {
    const { calls, promise } = run("vps power", ["svc_10432", "stop", "--no-wait"], [
      json({ object: "operation", id: "op_1", status: "running" }, 202),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls[0]!.url).toBe("https://api.truo.cloud/v1/vps/svc_10432/power");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ action: "stop" });
  });

  test("rejects a value outside the enum before spending a call", async () => {
    const { calls, promise } = run("vps power", ["svc_1", "explode"], [json({})]);
    await expect(promise).rejects.toThrow(/is not a valid value/);
    expect(calls).toHaveLength(0);
  });

  test("with a positional missing, the error carries the usage", async () => {
    const { promise } = run("vps power", ["svc_1"], [json({})]);
    const err = (await promise.catch((e) => e)) as CliError;
    expect(err.code).toBe(EXIT.USAGE);
    expect(err.hint).toContain("truo vps power <service_id> <action>");
  });

  test("query flags go to the query string", async () => {
    const { calls, promise } = run("vps list", ["--limit", "3"], [
      json({ object: "list", data: [], has_more: false }),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls[0]!.url).toContain("limit=3");
  });

  test("--body-json merges over the flags", async () => {
    const { calls, promise } = run("vps rename", ["svc_1", "--hostname", "a", "--body-json", '{"hostname":"b"}'], [
      json({ object: "vps", id: "svc_1" }),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ hostname: "b" });
  });
});

describe("destructive operations", () => {
  test("without --yes and without a TTY nothing runs", async () => {
    const { calls, promise } = run("vps backup delete", ["svc_1", "bk_1"], [json(null, 204)]);
    const err = (await promise.catch((e) => e)) as CliError;
    expect(err.code).toBe(EXIT.ABORTED);
    expect(calls).toHaveLength(0);
  });

  test("with --yes it runs", async () => {
    const { calls, promise } = run("vps backup delete", ["svc_1", "bk_1", "--yes"], [json(null, 204)]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls[0]!.init.method).toBe("DELETE");
  });
});

describe("asynchronous operations", () => {
  test("waits by default until the operation finishes", async () => {
    const { calls, promise } = run("vps power", ["svc_1", "stop"], [
      json({ object: "operation", id: "op_1", type: "vps.power", status: "running" }, 202),
      json({ object: "operation", id: "op_1", type: "vps.power", status: "succeeded" }),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[1]!.url).toContain("/v1/operations/op_1");
  });

  test("--no-wait returns the operation without polling", async () => {
    const { calls, promise } = run("vps power", ["svc_1", "stop", "--no-wait"], [
      json({ object: "operation", id: "op_1", status: "running" }, 202),
    ]);
    expect(await promise).toBe(EXIT.OK);
    expect(calls).toHaveLength(1);
  });
});

describe("API errors translated to exit codes", () => {
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

  test("a 403 for scope explains what to do", async () => {
    const { promise } = run("vps get", ["svc_1"], [
      json({ error: { type: "authorization_error", code: "insufficient_scope", message: "missing vps:read" } }, 403),
    ]);
    const err = (await promise.catch((e) => e)) as CliError;
    expect(err.hint).toContain("scope");
  });
});

describe("output", () => {
  const list = {
    object: "list",
    data: [
      { object: "vps", id: "svc_1", hostname: "web-01", state: "running" },
      { object: "vps", id: "svc_2", hostname: null, state: "stopped" },
    ],
    has_more: false,
  };

  test("-o id emits a column ready for xargs", () => {
    expect(render(list, { format: "id" })).toBe("svc_1\nsvc_2");
  });

  test("-o json unwraps the collection", () => {
    expect(JSON.parse(render(list, { format: "json" }))).toHaveLength(2);
  });

  test("-o jsonl gives one line per item", () => {
    expect(render(list, { format: "jsonl" }).split("\n")).toHaveLength(2);
  });

  test("the table orders columns by relevance, not by the JSON", () => {
    const header = render(list, { format: "table" }).split("\n")[0]!;
    expect(header.indexOf("ID")).toBeLessThan(header.indexOf("HOSTNAME"));
    expect(header).not.toContain("OBJECT");
  });

  test("--field trims by dotted path", () => {
    expect(selectPath(list, "data.0.hostname")).toBe("web-01");
    expect(selectPath(list, "data.9.hostname")).toBeUndefined();
  });
});

describe("argument parser", () => {
  test("--no-x negates, --x=y assigns, repeating accumulates", () => {
    const a = parseArgs(["vps", "list", "--no-wait", "--limit=5", "--tag", "a", "--tag", "b"]);
    expect(a.words).toEqual(["vps", "list"]);
    expect(a.flags.get("wait")).toBe(false);
    expect(a.flags.get("limit")).toBe("5");
    expect(a.flags.get("tag")).toEqual(["a", "b"]);
  });

  test("whatever comes after -- is not interpreted", () => {
    const a = parseArgs(["vps", "ssh", "svc_1", "--", "-p", "2222"]);
    expect(a.passthrough).toEqual(["-p", "2222"]);
    expect(a.flags.has("p")).toBe(false);
  });

  test("an unknown short flag fails instead of being ignored", () => {
    expect(() => parseArgs(["-Z"])).toThrow(/Unknown flag/);
  });
});
