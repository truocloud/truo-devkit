import { afterEach, describe, expect, test } from "bun:test";
import fixture from "../../../fixtures/urls.json" with { type: "json" };
import { createTruoLoader, pidFromEnv } from "../src/index.ts";

const PID = fixture.tenant.public_id;
const BASE = fixture.tenant.public_base_url;

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TRUO_IMG_PID;
});

describe("createTruoLoader", () => {
  test("builds what Next asks for: src + width + quality", () => {
    const loader = createTruoLoader({ pid: PID, baseUrl: BASE });
    expect(loader({ src: "/uploads/photo.jpg", width: 828, quality: 75 })).toBe(
      `${BASE}/i/${PID}/uploads/photo.jpg?f=auto&q=75&w=828`,
    );
  });

  test("no quality means no `q`: the service injects its own default", () => {
    // Emitting a quality Next did not ask for would make the URL differ from the
    // one the service would have produced, for no gain.
    const loader = createTruoLoader({ pid: PID, baseUrl: BASE });
    expect(loader({ src: "/uploads/photo.jpg", width: 640 })).toBe(
      `${BASE}/i/${PID}/uploads/photo.jpg?f=auto&w=640`,
    );
  });

  test("`format` can be pinned for setups behind a CDN that ignores Vary", () => {
    const loader = createTruoLoader({ pid: PID, baseUrl: BASE, format: "webp" });
    expect(loader({ src: "/a.jpg", width: 100 })).toBe(`${BASE}/i/${PID}/a.jpg?f=webp&w=100`);
  });

  test("`format: false` sends no format at all", () => {
    const loader = createTruoLoader({ pid: PID, baseUrl: BASE, format: false });
    expect(loader({ src: "/a.jpg", width: 100 })).toBe(`${BASE}/i/${PID}/a.jpg?w=100`);
  });

  test("an absolute source is proxied, not treated as a path", () => {
    const loader = createTruoLoader({ pid: PID, baseUrl: BASE });
    expect(loader({ src: "https://otro.com/a.jpg", width: 400 })).toContain("/fetch/https%3A%2F%2F");
  });

  test("a source that is already ours is not wrapped twice", () => {
    // `<Image>` inside a component that already ran through a rewrite is not a
    // hypothetical; it is the normal state of a partially migrated codebase.
    const loader = createTruoLoader({ pid: PID, baseUrl: BASE });
    const once = loader({ src: "/uploads/a.jpg", width: 400 });
    expect(loader({ src: once, width: 800 })).toBe(loader({ src: "/uploads/a.jpg", width: 800 }));
  });

  test("the pid comes from NEXT_PUBLIC_TRUO_IMG_PID", () => {
    process.env.NEXT_PUBLIC_TRUO_IMG_PID = PID;
    expect(pidFromEnv()).toBe(PID);
    expect(createTruoLoader({ baseUrl: BASE })({ src: "/a.jpg", width: 10 })).toContain(`/i/${PID}/`);
  });

  test("no pid anywhere is an actionable error, not a broken URL", () => {
    // The failure mode this replaces: a URL with `undefined` where the tenant
    // should be, 404 on every image, and nothing pointing at the cause.
    expect(() => createTruoLoader({ baseUrl: BASE })).toThrow(/NEXT_PUBLIC_TRUO_IMG_PID/);
  });
});

describe("the loaderFile contract", () => {
  test("the module has a DEFAULT export and it is a function", async () => {
    // Next's requirement, and it fails at build time with an error that does not
    // say which rule was broken. Asserting it here is cheaper than reading that
    // error in a customer's build log.
    const mod = await import("../src/loader.ts");
    expect(typeof mod.default).toBe("function");
  });

  test("the default export is synchronous", async () => {
    process.env.NEXT_PUBLIC_TRUO_IMG_PID = PID;
    const mod = await import("../src/loader.ts");
    const out = mod.default({ src: "/a.jpg", width: 100 });
    // An async loader is accepted by TypeScript and rejected by Next.
    expect(typeof out).toBe("string");
    expect(out).toContain(`/i/${PID}/a.jpg`);
  });
});
