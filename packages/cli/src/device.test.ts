/**
 * Device flow tests. No network: the global `fetch` is replaced.
 *
 * What gets tested is the protocol, not the happy path: `authorization_pending`
 * until the person approves, `slow_down` raising the interval, and the three
 * endings that are not a token (denied, expired, error). That handling is all
 * that separates "approve in the browser" from "the login failed and I don't
 * know why".
 */
import { afterEach, describe, expect, test } from "bun:test";
import { grantableScopes, pollForToken, requestDeviceCode } from "./device.ts";
import { CliError, EXIT } from "./exit.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Queues responses: each call consumes the next one. */
function stub(responses: Array<{ status: number; body: unknown }>): { calls: number } {
  const state = { calls: 0 };
  globalThis.fetch = (async () => {
    const next = responses[Math.min(state.calls, responses.length - 1)]!;
    state.calls++;
    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return state;
}

const IDP = "https://idp.example";

const CODE_OK = {
  status: 200,
  body: {
    device_code: "dev_abc",
    user_code: "WXYZ-1234",
    verification_uri: "/device",
    expires_in: 30,
    // 0 so tests do not actually wait; the code raises it to the 1 s floor.
    interval: 0,
  },
};

describe("grantableScopes", () => {
  test("comes from the contract and excludes what is not grantable to a key", () => {
    const scopes = grantableScopes();
    expect(scopes.length).toBeGreaterThan(10);
    // Requesting them would fail the whole creation with a 403: the API does not grant them to keys.
    expect(scopes.some((s) => s.startsWith("apikeys:"))).toBe(false);
    expect(scopes.some((s) => s.startsWith("users:"))).toBe(false);
    // And what is grantable must be there, or the CLI creates a key its own
    // commands get 403s with.
    expect(scopes).toContain("vps:read");
    expect(scopes).toContain("dns:write");
  });
});

describe("requestDeviceCode", () => {
  test("absolutizes a relative verification_uri", async () => {
    stub([CODE_OK]);
    const auth = await requestDeviceCode(IDP, ["vps:read"]);
    expect(auth.verificationUri).toBe("https://idp.example/device");
    expect(auth.verificationUriComplete).toContain("user_code=WXYZ-1234");
    // The RFC floor: a server returning 0 must not make us hammer it.
    expect(auth.interval).toBeGreaterThanOrEqual(1);
  });

  test("an IdP rejection comes out as an authentication error, not a crash", async () => {
    stub([{ status: 400, body: { error: "invalid_client" } }]);
    const err = (await requestDeviceCode(IDP, ["vps:read"]).catch((e) => e)) as CliError;
    expect(err).toBeInstanceOf(CliError);
    expect(err.code).toBe(EXIT.UNAUTHENTICATED);
    expect(err.message).toContain("invalid_client");
  });
});

describe("pollForToken", () => {
  const auth = {
    deviceCode: "dev_abc",
    userCode: "WXYZ-1234",
    verificationUri: `${IDP}/device`,
    verificationUriComplete: null,
    expiresIn: 30,
    interval: 1,
  };

  /** Records how long it would have waited, without waiting. */
  function fakeClock(): { waits: number[]; wait: (ms: number) => Promise<void> } {
    const waits: number[] = [];
    return {
      waits,
      wait: async (ms) => {
        waits.push(ms);
      },
    };
  }

  test("keeps waiting while the server says authorization_pending", async () => {
    const state = stub([
      { status: 400, body: { error: "authorization_pending" } },
      { status: 400, body: { error: "authorization_pending" } },
      { status: 200, body: { access_token: "sess_123" } },
    ]);
    const clock = fakeClock();
    expect(await pollForToken(IDP, auth, { wait: clock.wait })).toBe("sess_123");
    expect(state.calls).toBe(3);
    // The interval does not move on its own: only `slow_down` raises it.
    expect(clock.waits).toEqual([1000, 1000, 1000]);
  });

  test("slow_down raises the interval by 5 s, as the RFC requires", async () => {
    stub([
      { status: 400, body: { error: "slow_down" } },
      { status: 400, body: { error: "slow_down" } },
      { status: 200, body: { access_token: "sess_456" } },
    ]);
    const clock = fakeClock();
    expect(await pollForToken(IDP, auth, { wait: clock.wait })).toBe("sess_456");
    expect(clock.waits).toEqual([1000, 6000, 11_000]);
  });

  test("an interval of 0 does not become a tight loop against the IdP", async () => {
    stub([{ status: 200, body: { access_token: "sess_000" } }]);
    const clock = fakeClock();
    await pollForToken(IDP, { ...auth, interval: 0 }, { wait: clock.wait });
    expect(clock.waits[0]).toBeGreaterThanOrEqual(1000);
  });

  test("declining in the browser ends in ABORTED", async () => {
    stub([{ status: 400, body: { error: "access_denied" } }]);
    const err = (await pollForToken(IDP, auth, { wait: async () => {} }).catch((e) => e)) as CliError;
    expect(err.code).toBe(EXIT.ABORTED);
  });

  test("an expired code says how to retry", async () => {
    stub([{ status: 400, body: { error: "expired_token" } }]);
    const err = (await pollForToken(IDP, auth, { wait: async () => {} }).catch((e) => e)) as CliError;
    expect(err.code).toBe(EXIT.UNAUTHENTICATED);
    expect(err.hint).toContain("truo auth login");
  });

  test("a network blip retries instead of losing the approval", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) throw new Error("ECONNRESET");
      return new Response(JSON.stringify({ access_token: "sess_789" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
    expect(await pollForToken(IDP, auth, { wait: async () => {} })).toBe("sess_789");
    expect(calls).toBe(2);
  });
});
