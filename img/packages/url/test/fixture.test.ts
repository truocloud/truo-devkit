/**
 * The core, checked against the shared fixture.
 *
 * These vectors are the same ones the service verifies against itself and the
 * same ones the WordPress plugin's PHP builder will run. If this file passes and
 * theirs does too, three implementations in three languages emit byte-identical
 * URLs — which is the only property that makes a signed URL, a CDN cache entry
 * and a `srcset` mean the same thing everywhere.
 */
import { describe, expect, test } from "bun:test";
import fixture from "../../../fixtures/urls.json" with { type: "json" };
import { buildUrl, createTruoImg, parseUrl, resolveWidths, srcset } from "../src/index.ts";
import { signUrl, webSigner } from "../src/sign.ts";
import type { Transform, TruoImgConfig } from "../src/config.ts";

const cfg: TruoImgConfig = {
  pid: fixture.tenant.public_id,
  baseUrl: fixture.tenant.public_base_url,
  maxWidth: fixture.tenant.max_width,
};

describe("buildUrl against the fixture", () => {
  for (const v of fixture.vectors) {
    test(`${v.name}: ${v.why.slice(0, 70)}…`, () => {
      expect(buildUrl(v.src, v.transform as Transform, cfg)).toBe(v.expected);
    });
  }
});

describe("round trip (unpic requires it)", () => {
  for (const v of fixture.vectors) {
    if (v.mode === "passthrough") continue;

    test(`${v.name}: parse then build gives the same URL back`, () => {
      const parsed = parseUrl(v.expected);
      expect(parsed).not.toBeNull();
      expect(parsed!.pid).toBe(fixture.tenant.public_id);
      expect(parsed!.mode).toBe(v.mode as "endpoint" | "fetch");
      // Rebuilding from what parsing recovered has to land on the same string.
      // This is stronger than comparing `parsed.src` to the input: building
      // normalises (a leading slash disappears, parameters get sorted), and the
      // URL genuinely does not carry that information.
      expect(buildUrl(parsed!.src, parsed!.transform, cfg)).toBe(v.expected);
    });
  }

  test("a URL that is not ours parses to null", () => {
    expect(parseUrl("https://images.example.com/photo.jpg")).toBeNull();
    expect(parseUrl("https://img.truo.cloud/health")).toBeNull();
    expect(parseUrl("not a url at all")).toBeNull();
  });

  test("a signed URL round-trips its signature separately from the transform", () => {
    const signedVector = fixture.vectors.find((v) => "expected_signed" in v && v.expected_signed)!;
    const parsed = parseUrl((signedVector as { expected_signed: string }).expected_signed)!;
    expect(parsed.signature).toBeTruthy();
    // `s` and `exp` must NOT come back inside `transform`: rebuilding with them
    // would produce a URL carrying a signature that no longer covers it.
    expect(parsed.transform.s).toBeUndefined();
    expect(parsed.transform.exp).toBeUndefined();
  });
});

describe("signUrl against the fixture", () => {
  const signed = fixture.vectors.filter(
    (v): v is typeof v & { expected_signed: string } => "expected_signed" in v && !!v.expected_signed,
  );

  test("there are signed vectors to check", () => {
    expect(signed.length).toBeGreaterThan(3);
  });

  for (const v of signed) {
    test(`${v.name}: the signature matches the service byte for byte`, async () => {
      const out = await signUrl(v.expected, {
        secret: fixture.tenant.signing_secret,
        signer: webSigner(),
        ...(v.exp ? { expiresAt: v.exp } : {}),
      });
      expect(out).toBe(v.expected_signed);
    });

  }

  test("`ttl` is turned into an absolute `exp`", async () => {
    const out = await signUrl(buildUrl("uploads/a.jpg", { width: 100 }, cfg), {
      secret: fixture.tenant.signing_secret,
      ttl: 3600,
      now: 1_700_000_000_000,
    });
    expect(new URL(out).searchParams.get("exp")).toBe(String(1_700_000_000 + 3600));
  });

  test("signing something that is not a delivery URL throws", () => {
    expect(signUrl("https://img.truo.cloud/health", { secret: "x" })).rejects.toThrow();
  });
});

describe("srcset against the fixture", () => {
  for (const s of fixture.srcset) {
    test(`${s.name}: ${s.why.slice(0, 60)}…`, () => {
      const local: TruoImgConfig = { ...cfg, ...(s.max_width ? { maxWidth: s.max_width } : {}) };
      const out = srcset(
        s.src,
        { ...(s.widths ? { widths: s.widths } : {}), transform: s.transform as Transform },
        local,
      );
      expect(out).toBe(s.expected);
    });
  }

  test("clamping happens BEFORE de-duplicating", () => {
    // The other order emits two identical URLs with different descriptors: the
    // browser downloads the same bytes believing one is larger, and we pay for a
    // cache entry that can never be hit.
    expect(resolveWidths([2048, 4096, 8192], 4096)).toEqual([2048, 4096]);
  });

  test("a `sizes` attribute comes out in ascending breakpoint order", () => {
    const img = createTruoImg(cfg);
    expect(img.sizes([[1200, "50vw"], [768, "100vw"]], "33vw")).toBe(
      "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    );
  });
});

describe("guards", () => {
  test("no pid is a loud error, not a broken URL", () => {
    expect(() => createTruoImg({ pid: "" })).toThrow(/pid/);
    expect(() => buildUrl("a.jpg", {}, { pid: "" })).toThrow(/pid/);
  });

  test("data: and blob: pass through untouched", () => {
    const img = createTruoImg(cfg);
    const data = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    expect(img.url(data, { width: 800 })).toBe(data);
    expect(img.url("blob:https://example.com/abc", { width: 800 })).toBe("blob:https://example.com/abc");
  });

  test("false drops the parameter, true becomes 1", () => {
    const img = createTruoImg(cfg);
    expect(img.url("a.jpg", { withoutEnlargement: false, width: 10 })).toBe(
      `${fixture.tenant.public_base_url}/i/${fixture.tenant.public_id}/a.jpg?w=10`,
    );
    expect(img.url("a.jpg", { withoutEnlargement: true, width: 10 })).toBe(
      `${fixture.tenant.public_base_url}/i/${fixture.tenant.public_id}/a.jpg?w=10&we=1`,
    );
  });

  test("null, undefined and empty string drop the parameter", () => {
    // Templating engines hand these over constantly; emitting `?w=` would be a
    // parameter the service drops anyway, but with a different URL for the CDN.
    const img = createTruoImg(cfg);
    const bare = `${fixture.tenant.public_base_url}/i/${fixture.tenant.public_id}/a.jpg`;
    expect(img.url("a.jpg", { width: null, height: undefined, format: "" })).toBe(bare);
  });

  test("wrapping an already-wrapped URL does not wrap it twice", () => {
    const img = createTruoImg(cfg);
    const once = img.url("uploads/a.jpg", { width: 400 });
    expect(img.url(once, { width: 800 })).toBe(img.url("uploads/a.jpg", { width: 800 }));
    expect(img.url(img.url(once, { width: 800 }))).not.toContain("fetch/");
  });

  test("re-wrapping drops a signature instead of carrying an invalid one", async () => {
    const img = createTruoImg(cfg);
    const signed = await signUrl(img.url("uploads/a.jpg", { width: 400 }), {
      secret: fixture.tenant.signing_secret,
      expiresAt: 4_102_444_800,
    });
    const rewrapped = img.url(signed, { width: 800 });
    // Carrying `s` over would produce a URL that 403s: the signature covers the
    // old query. Dropping it fails at the right place instead.
    expect(rewrapped).not.toContain("s=");
    expect(rewrapped).not.toContain("exp=");
  });
});
