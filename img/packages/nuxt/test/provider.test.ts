import { describe, expect, test } from "bun:test";
import fixture from "../../../fixtures/urls.json" with { type: "json" };
import provider, { getImage, resolveEndpoint } from "../src/index.ts";

const BASE = fixture.tenant.public_base_url;
const PID = fixture.tenant.public_id;

describe("getImage", () => {
  test("the modifiers @nuxt/image normalises are the ones we accept", () => {
    // `width`/`height`/`format`/`quality`/`fit` is exactly the vocabulary the
    // core takes, which is why this provider is an adapter and not a second
    // URL builder that could disagree with the fixture.
    const { url } = getImage("/uploads/foto.jpg", {
      pid: PID,
      baseUrl: BASE,
      modifiers: { width: 800, height: 600, quality: 75, fit: "cover" },
    });
    expect(url).toBe(`${BASE}/i/${PID}/uploads/foto.jpg?f=auto&fit=cover&h=600&q=75&w=800`);
  });

  test("an explicit format beats the `auto` default", () => {
    const { url } = getImage("/a.jpg", {
      pid: PID,
      baseUrl: BASE,
      modifiers: { width: 100, format: "webp" },
    });
    expect(url).toBe(`${BASE}/i/${PID}/a.jpg?f=webp&w=100`);
  });

  test("`format: false` sends no format", () => {
    const { url } = getImage("/a.jpg", { pid: PID, baseUrl: BASE, format: false, modifiers: { width: 100 } });
    expect(url).toBe(`${BASE}/i/${PID}/a.jpg?w=100`);
  });

  test("the default export is the shape @nuxt/image reads", () => {
    expect(typeof provider.getImage).toBe("function");
  });
});

describe("resolveEndpoint", () => {
  test("a pid is enough", () => {
    expect(resolveEndpoint({ pid: "acme" })).toMatchObject({ pid: "acme" });
  });

  test("a full baseURL works too — it is the only way to use a custom domain", () => {
    expect(resolveEndpoint({ baseURL: "https://images.example.com/i/acme" })).toMatchObject({
      pid: "acme",
      baseUrl: "https://images.example.com",
    });
  });

  test("a trailing slash is tolerated", () => {
    expect(resolveEndpoint({ baseURL: "https://img.truo.cloud/i/acme/" })).toMatchObject({ pid: "acme" });
  });

  test("a baseURL that is not an endpoint is an actionable error", () => {
    // The failure this replaces: images 404 in production and the config looks
    // plausible. Naming the expected shape is the whole value of the message.
    expect(() => resolveEndpoint({ baseURL: "https://img.truo.cloud" })).toThrow(/\/i\/<pid>/);
  });

  test("no configuration at all names the setting and where to find it", () => {
    expect(() => resolveEndpoint({})).toThrow(/pid/);
  });
});
