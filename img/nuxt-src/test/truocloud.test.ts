/**
 * The upstream Nuxt provider, against the real `@nuxt/image` helpers and the
 * shared fixture.
 *
 * This provider is a SECOND implementation of the URL contract — an upstream
 * provider cannot depend on `@truocloud/img`, so it re-derives the same rules
 * with their `createOperationsGenerator`. Running the shared vectors through it
 * is the only thing that keeps the two honest: a hand-written example would
 * only prove the file agrees with whoever wrote the example.
 */
import { describe, expect, test } from "bun:test";
import fixture from "../../fixtures/urls.json" with { type: "json" };
import provider from "../truocloud.ts";

const PID = fixture.tenant.public_id;
const BASE = `${fixture.tenant.public_base_url}/i/${PID}`;

const impl = (provider as unknown as () => { getImage: Function })();
const url = (src: string, modifiers: Record<string, unknown> = {}): string =>
  impl.getImage(src, { modifiers, baseURL: BASE }).url;

describe("the vectors this provider can express", () => {
  // Only the endpoint-mode vectors whose transform is made of modifiers
  // `@nuxt/image` actually normalises. The proxy mode and the raw escape hatches
  // are not reachable through a Nuxt provider, and pretending otherwise would be
  // a test that asserts nothing.
  const reachable = fixture.vectors.filter(
    (v) => v.mode === "endpoint" && !("expected_signed" in v && v.expected_signed),
  );

  test("there are vectors to run", () => {
    expect(reachable.length).toBeGreaterThan(5);
  });

  for (const v of reachable) {
    // `f=auto` is injected by the published package, not by a modifier, so a
    // vector that carries it has to pass it explicitly here.
    test(`${v.name}`, () => {
      const out = url(v.src, v.transform as Record<string, unknown>);
      expect(out).toBe(v.expected);
    });
  }
});

describe("encoding", () => {
  test("parentheses and spaces use the strict RFC 3986 form", () => {
    // PHP's rawurlencode escapes !*'() and encodeURIComponent does not. The
    // CMS-side builder of this contract uses the former, and "mi foto (1).jpg"
    // is literally how WordPress names a duplicated upload.
    expect(url("uploads/mi foto (1).jpg", { width: 600 })).toBe(
      `${BASE}/uploads/mi%20foto%20%281%29.jpg?w=600`,
    );
  });

  test("a plus sign becomes %2B", () => {
    // This path ends up inside a query parameter upstream, where a raw `+`
    // means a space and the file is not found — with a 404 nobody can explain.
    expect(url("uploads/a+b.jpg", { width: 200 })).toBe(`${BASE}/uploads/a%2Bb.jpg?w=200`);
  });

  test("slashes separate segments and are not encoded", () => {
    expect(url("2026/08/foto.jpg", { width: 300 })).toBe(`${BASE}/2026/08/foto.jpg?w=300`);
  });

  test("a leading slash is normalised away", () => {
    expect(url("/uploads/foto.jpg", { width: 400 })).toBe(url("uploads/foto.jpg", { width: 400 }));
  });
});

describe("parameters", () => {
  test("come out sorted by name", () => {
    expect(url("a.jpg", { quality: 70, width: 800, format: "auto" })).toBe(
      `${BASE}/a.jpg?f=auto&q=70&w=800`,
    );
  });

  test("`jpeg` maps to `jpg`", () => {
    expect(url("a.jpg", { format: "jpeg" })).toContain("f=jpg");
  });

  test("no modifiers means no query at all", () => {
    // A bare URL is a byte passthrough. Emitting `?` alone would be a different
    // cache entry for the same image.
    expect(url("a.jpg")).toBe(`${BASE}/a.jpg`);
  });

  test("commas stay literal", () => {
    expect(url("a.jpg", { crop: "60,30,0,0" })).toContain("crop=60,30,0,0");
  });
});
