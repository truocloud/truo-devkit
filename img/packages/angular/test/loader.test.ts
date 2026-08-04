/**
 * The Angular loader.
 *
 * `createTruoImageLoader` is tested rather than `provideTruoImageLoader` because
 * the provider is three tokens of Angular wiring around it — everything that can
 * actually be wrong lives in the function. `IMAGE_LOADER` being wired correctly
 * is what the TestBed check in CI covers.
 */
import { describe, expect, test } from "bun:test";
import fixture from "../../../fixtures/urls.json" with { type: "json" };
import { createTruoImageLoader, parseEndpoint } from "../src/loader.ts";

const BASE = fixture.tenant.public_base_url;
const PID = fixture.tenant.public_id;
const ENDPOINT = `${BASE}/i/${PID}`;

describe("createTruoImageLoader", () => {
  const loader = createTruoImageLoader(ENDPOINT);

  test("ngSrc + width is the common case", () => {
    expect(loader({ src: "uploads/photo.jpg", width: 800 })).toBe(
      `${BASE}/i/${PID}/uploads/photo.jpg?f=auto&w=800`,
    );
  });

  test("no width (a fill image) still produces a valid URL", () => {
    // `NgOptimizedImage` calls the loader without a width for `fill` images.
    // Emitting `w=undefined` would be a 400 on every one of them.
    expect(loader({ src: "uploads/photo.jpg" })).toBe(`${BASE}/i/${PID}/uploads/photo.jpg?f=auto`);
  });

  test("`loaderParams` reaches the URL — it is the escape hatch for anything the directive does not model", () => {
    expect(loader({ src: "a.jpg", width: 300, loaderParams: { transform: { fit: "cover", gravity: "attention" } } })).toBe(
      `${BASE}/i/${PID}/a.jpg?a=attention&f=auto&fit=cover&w=300`,
    );
  });

  test("`loaderParams` without the `transform` wrapper works too", () => {
    // People will write it both ways; guessing wrong means silently dropping
    // their parameters.
    expect(loader({ src: "a.jpg", width: 300, loaderParams: { fit: "cover" } })).toContain("fit=cover");
  });

  test("a placeholder is tiny and blurred, not the full image", () => {
    const url = loader({ src: "a.jpg", width: 800, isPlaceholder: true });
    expect(url).toContain("w=20");
    expect(url).toContain("blur=2");
    expect(url).not.toContain("w=800");
  });

  test("the format can be pinned for setups behind a CDN that ignores Vary", () => {
    const pinned = createTruoImageLoader(ENDPOINT, { format: "webp" });
    expect(pinned({ src: "a.jpg", width: 100 })).toBe(`${BASE}/i/${PID}/a.jpg?f=webp&w=100`);
  });
});

describe("parseEndpoint", () => {
  test("splits the endpoint the console publishes", () => {
    expect(parseEndpoint(ENDPOINT)).toEqual({ baseUrl: BASE, pid: PID });
  });

  test("tolerates a trailing slash and surrounding whitespace", () => {
    // Both come free with copy-paste, and neither is a mistake worth an error.
    expect(parseEndpoint(`  ${ENDPOINT}/  `)).toEqual({ baseUrl: BASE, pid: PID });
  });

  test("an origin without the /i/<pid> part names the expected shape", () => {
    expect(() => parseEndpoint(BASE)).toThrow(/\/i\/<pid>/);
  });
});
