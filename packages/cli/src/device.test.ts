/**
 * Tests del device flow. Sin red: se reemplaza el `fetch` global.
 *
 * Lo que se prueba es el protocolo, no el happy path: `authorization_pending`
 * hasta que la persona aprueba, `slow_down` subiendo el intervalo, y los tres
 * finales que no son un token (denegado, vencido, error). Ese manejo es todo lo
 * que separa "aprobá en el navegador" de "el login falló y no sé por qué".
 */
import { afterEach, describe, expect, test } from "bun:test";
import { grantableScopes, pollForToken, requestDeviceCode } from "./device.ts";
import { CliError, EXIT } from "./exit.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Encola respuestas: cada llamada consume la siguiente. */
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
    // 0 para que los tests no esperen de verdad; el codigo lo eleva al piso de 1 s.
    interval: 0,
  },
};

describe("grantableScopes", () => {
  test("sale del contrato y excluye lo que no es otorgable a una key", () => {
    const scopes = grantableScopes();
    expect(scopes.length).toBeGreaterThan(10);
    // Pedirlos haria fallar el alta entera con 403: la API no los otorga a keys.
    expect(scopes.some((s) => s.startsWith("apikeys:"))).toBe(false);
    expect(scopes.some((s) => s.startsWith("users:"))).toBe(false);
    // Y lo que si es otorgable tiene que estar, o el CLI se crea una key con la
    // que sus propios comandos dan 403.
    expect(scopes).toContain("vps:read");
    expect(scopes).toContain("dns:write");
  });
});

describe("requestDeviceCode", () => {
  test("absolutiza una verification_uri relativa", async () => {
    stub([CODE_OK]);
    const auth = await requestDeviceCode(IDP, ["vps:read"]);
    expect(auth.verificationUri).toBe("https://idp.example/device");
    expect(auth.verificationUriComplete).toContain("user_code=WXYZ-1234");
    // El piso del RFC: un servidor que devuelve 0 no debe hacernos martillarlo.
    expect(auth.interval).toBeGreaterThanOrEqual(1);
  });

  test("un rechazo del IdP sale como error de autenticacion, no como crash", async () => {
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

  /** Registra cuanto se hubiera esperado, sin esperar. */
  function fakeClock(): { waits: number[]; wait: (ms: number) => Promise<void> } {
    const waits: number[] = [];
    return {
      waits,
      wait: async (ms) => {
        waits.push(ms);
      },
    };
  }

  test("sigue esperando mientras el servidor dice authorization_pending", async () => {
    const state = stub([
      { status: 400, body: { error: "authorization_pending" } },
      { status: 400, body: { error: "authorization_pending" } },
      { status: 200, body: { access_token: "sess_123" } },
    ]);
    const clock = fakeClock();
    expect(await pollForToken(IDP, auth, { wait: clock.wait })).toBe("sess_123");
    expect(state.calls).toBe(3);
    // El intervalo no se mueve solo: solo `slow_down` lo sube.
    expect(clock.waits).toEqual([1000, 1000, 1000]);
  });

  test("slow_down sube el intervalo 5 s, como manda el RFC", async () => {
    stub([
      { status: 400, body: { error: "slow_down" } },
      { status: 400, body: { error: "slow_down" } },
      { status: 200, body: { access_token: "sess_456" } },
    ]);
    const clock = fakeClock();
    expect(await pollForToken(IDP, auth, { wait: clock.wait })).toBe("sess_456");
    expect(clock.waits).toEqual([1000, 6000, 11_000]);
  });

  test("un intervalo de 0 no se convierte en un bucle cerrado contra el IdP", async () => {
    stub([{ status: 200, body: { access_token: "sess_000" } }]);
    const clock = fakeClock();
    await pollForToken(IDP, { ...auth, interval: 0 }, { wait: clock.wait });
    expect(clock.waits[0]).toBeGreaterThanOrEqual(1000);
  });

  test("rechazar en el navegador termina en ABORTED", async () => {
    stub([{ status: 400, body: { error: "access_denied" } }]);
    const err = (await pollForToken(IDP, auth, { wait: async () => {} }).catch((e) => e)) as CliError;
    expect(err.code).toBe(EXIT.ABORTED);
  });

  test("un codigo vencido dice como reintentar", async () => {
    stub([{ status: 400, body: { error: "expired_token" } }]);
    const err = (await pollForToken(IDP, auth, { wait: async () => {} }).catch((e) => e)) as CliError;
    expect(err.code).toBe(EXIT.UNAUTHENTICATED);
    expect(err.hint).toContain("truo auth login");
  });

  test("un corte de red reintenta en vez de perder la aprobacion", async () => {
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
