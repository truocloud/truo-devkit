/**
 * The unpic provider, against the real `unpic` package and the shared fixture.
 *
 * The round trip is not a nicety here: unpic's whole model is
 * `extract` -> operations -> `generate`, and a provider that loses information
 * on the way through produces images at the wrong size the moment somebody
 * changes one operation on an existing URL.
 */
import { describe, expect, test } from "bun:test";
import fixture from "../../fixtures/urls.json" with { type: "json" };
import { extract, generate, transform } from "../truocloud.ts";

const BASE = fixture.tenant.public_base_url;
const PID = fixture.tenant.public_id;

describe("extract", () => {
  test("splits a delivery URL into source and operations", () => {
    const out = extract(`${BASE}/i/${PID}/uploads/foto.jpg?f=auto&w=800`);
    expect(out).not.toBeNull();
    expect(out!.src).toBe(`${BASE}/i/${PID}/uploads/foto.jpg`);
    expect(out!.operations.width).toBe(800);
    expect(out!.operations.format).toBe("auto");
  });

  test("returns null for a URL that is not a delivery URL", () => {
    // unpic asks every provider; claiming a URL that is not ours would rewrite
    // somebody else's images through our service.
    expect(extract(`${BASE}/health`)).toBeNull();
    expect(extract("https://images.example.com/a.jpg?w=100")).toBeNull();
    expect(extract(`${BASE}/i/acme/`)).toBeNull();
  });

  test("a signature does NOT come back as an operation", () => {
    const signed = fixture.vectors.find(
      (v): v is typeof v & { expected_signed: string } => "expected_signed" in v && !!v.expected_signed,
    )!;
    const out = extract(signed.expected_signed)!;
    // Handing `s` back as an operation lets a caller regenerate a URL carrying a
    // signature that no longer covers it: a 403 at display time with nothing
    // pointing at the cause.
    expect(out.operations.s).toBeUndefined();
    expect(out.operations.exp).toBeUndefined();
  });
});

describe("generate", () => {
  test("emits parameters in canonical (sorted) order", () => {
    // Same image, same URL — whichever builder produced it. Two orderings are two
    // CDN cache entries.
    const url = generate(`${BASE}/i/${PID}/uploads/foto.jpg`, { width: 800, format: "auto" });
    expect(url).toBe(`${BASE}/i/${PID}/uploads/foto.jpg?f=auto&w=800`);
  });

  test("maps unpic's vocabulary onto the service's", () => {
    const url = generate(`${BASE}/i/${PID}/a.jpg`, { width: 300, height: 200, quality: 70 });
    expect(url).toBe(`${BASE}/i/${PID}/a.jpg?h=200&q=70&w=300`);
  });

  test("`jpeg` becomes `jpg`", () => {
    // The service answers `jpg`; `format: "jpeg"` would be dropped in silence and
    // the caller would get the source format back without knowing why.
    expect(generate(`${BASE}/i/${PID}/a.jpg`, { format: "jpeg" })).toContain("f=jpg");
  });

  test("commas stay literal", () => {
    // The engine does not decode `%2C`: with the comma escaped the crop is
    // ignored and the image comes back uncropped, with a 200.
    expect(generate(`${BASE}/i/${PID}/a.jpg`, { crop: "60,30,0,0" })).toContain("crop=60,30,0,0");
  });
});

describe("round trip against every fixture vector", () => {
  for (const v of fixture.vectors) {
    if (v.mode === "passthrough") continue;

    test(`${v.name}: extract then generate returns the same URL`, () => {
      const out = extract(v.expected);
      expect(out).not.toBeNull();
      expect(generate(out!.src, out!.operations)).toBe(v.expected);
    });
  }
});

describe("transform", () => {
  test("changes one operation and leaves the rest alone", () => {
    // This is what unpic actually does in a component: take the URL that is in
    // the markup and re-issue it at the width the layout needs.
    const start = `${BASE}/i/${PID}/uploads/foto.jpg?f=auto&q=70&w=800`;
    expect(transform(start, { width: 400 })).toBe(`${BASE}/i/${PID}/uploads/foto.jpg?f=auto&q=70&w=400`);
  });

  test("a proxied source survives the round trip intact", () => {
    const start = `${BASE}/i/${PID}/fetch/https%3A%2F%2Fotro.com%2Fa.jpg?w=400`;
    expect(transform(start, { width: 800 })).toBe(
      `${BASE}/i/${PID}/fetch/https%3A%2F%2Fotro.com%2Fa.jpg?w=800`,
    );
  });
});
