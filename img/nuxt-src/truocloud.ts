/**
 * @nuxt/image provider for img.truo.cloud.
 *
 * **This file is not published.** It is the source of an upstream pull request
 * to `nuxt/image`, kept here so it is tested on every commit instead of drifting
 * between the day it is written and the day it is merged.
 *
 * It is self-contained by necessity — an upstream provider cannot depend on
 * `@truocloud/img` — which means it is a SECOND implementation of the same URL
 * contract. That is exactly the situation `fixtures/urls.json` exists for, and
 * why the test next to this file runs the shared vectors rather than examples
 * somebody wrote by hand.
 *
 * `bun run nuxt:prepare` rewrites the two imports into the relative form their
 * tree uses (`../utils/index.js`, `../utils/provider.js`).
 */
import { joinURL } from "ufo";
// Their PUBLIC runtime entry re-exports both helpers, so the test here runs
// against the same code the provider will use inside their tree. Upstream the
// imports are relative (`../utils/index.js`, `../utils/provider.js`); that is
// the only difference, and `bun run nuxt:prepare` makes it.
import { createOperationsGenerator, defineProvider } from "@nuxt/image/runtime";

interface TruoCloudOptions {
  /** the endpoint, `https://img.truo.cloud/i/<pid>` */
  baseURL?: string;
}

/**
 * Standard modifier name -> the service's wire name.
 *
 * Declared as a const rather than inline so it can be reversed below: a URL that
 * is already ours carries WIRE names (`w`), while modifiers arrive with STANDARD
 * names (`width`). Merging them without translating one side first emits both,
 * and `?w=400&w=800` means whichever the service reads first — not what the
 * caller asked for.
 */
const KEY_MAP = {
  width: "w",
  height: "h",
  format: "f",
  quality: "q",
  fit: "fit",
  dpr: "dpr",
  background: "bg",
  rotate: "ro",
  blur: "blur",
  sharpen: "sharp",
  brightness: "bri",
  contrast: "con",
  saturation: "sat",
  gamma: "gam",
  gravity: "a",
  crop: "crop",
  trim: "trim",
  mask: "mask",
  filter: "filt",
  withoutEnlargement: "we",
  lossless: "ll",
  progressive: "il",
  frames: "n",
} as const;

const WIRE_TO_STANDARD: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([standard, wire]) => [wire, standard]),
);

export const operationsGenerator = createOperationsGenerator({
  keyMap: KEY_MAP,
  valueMap: {
    // The service answers `jpg`; `jpeg` would be dropped in silence and the
    // caller would get the source format back without knowing why.
    format: {
      jpeg: "jpg",
      jpg: "jpg",
      png: "png",
      webp: "webp",
      avif: "avif",
      gif: "gif",
      tiff: "tiff",
      // negotiates from the Accept header, answered with `Vary: Accept`
      auto: "auto",
    },
  },
});

/**
 * RFC 3986 per path segment.
 *
 * Not `encodeURI`, and not nothing: this path ends up inside a query parameter
 * upstream, where a raw `+` means a space and the file would not be found. The
 * strict form also matches PHP's `rawurlencode`, which is what the CMS-side
 * builders of this contract use — two encodings of the same file are two CDN
 * cache entries and two different signatures.
 */
function encodePath(path: string): string {
  return path
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");
}

/**
 * Canonical parameter order: sorted by name.
 *
 * Every builder of this contract emits them sorted, so a URL produced here has
 * to look like a URL produced by any of the others. Two orderings of the same
 * request are two cache entries for one image.
 */
function canonicalise(query: string): string {
  if (!query) return "";
  return query
    .split("&")
    .sort((a, b) => (a.split("=")[0]! < b.split("=")[0]! ? -1 : 1))
    .join("&")
    // The engine does not decode `%2C`: with the comma escaped a crop is
    // ignored in silence and the image comes back uncropped, with a 200.
    .replace(/%2C/g, ",");
}

/**
 * Booleans travel as `1`, and `false` drops the parameter entirely.
 *
 * `createOperationsGenerator` stringifies `true` as `"true"`, which the service
 * accepts — but the other builders of this contract emit `1`, and two spellings
 * of the same request are two CDN cache entries for one image and two different
 * signatures. Normalising before the generator is cheaper than unpicking it
 * from the query afterwards.
 */
function normaliseModifiers(modifiers: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(modifiers)) {
    if (value === false || value === null || value === undefined || value === "") continue;
    out[key] = value === true ? 1 : value;
  }
  return out;
}

/**
 * Splits a source that is ALREADY one of our URLs.
 *
 * Without this, `<NuxtImg>` pointed at a URL the CDN already serves produces
 * `/i/acme/https%3A//img.truo.cloud/i/acme/…` — a URL that works, costs twice
 * and is unreadable in a bug report. It is not a hypothetical: it is the normal
 * state of a partially migrated codebase, and Nuxt re-runs the provider over
 * whatever `src` it is given.
 */
function unwrap(src: string, baseURL: string): { path: string; carried: Record<string, string> } | null {
  const prefix = baseURL.replace(/\/+$/, "");
  if (!src.toLowerCase().startsWith(`${prefix.toLowerCase()}/`)) return null;
  const rest = src.slice(prefix.length + 1);
  const q = rest.indexOf("?");
  if (q === -1) return { path: rest, carried: {} };

  const carried: Record<string, string> = {};
  for (const pair of rest.slice(q + 1).split("&")) {
    const [k, v = ""] = pair.split("=");
    // A signature covers a specific path and query and cannot be re-derived
    // here, so carrying it over would produce a URL that 403s.
    if (!k || k === "s" || k === "exp") continue;
    const name = decodeURIComponent(k);
    carried[WIRE_TO_STANDARD[name] ?? name] = decodeURIComponent(v);
  }
  return { path: rest.slice(0, q), carried };
}

export default defineProvider<TruoCloudOptions>({
  getImage: (src, { modifiers, baseURL = "https://img.truo.cloud" }) => {
    const existing = unwrap(src, baseURL);
    // The explicit call wins over what was glued to the URL: the caller asking
    // now knows more than the markup did.
    const merged = { ...(existing?.carried ?? {}), ...normaliseModifiers(modifiers) };
    // An already-encoded path is reused verbatim; encoding it again would turn
    // `%20` into `%2520`.
    const path = existing ? existing.path : encodePath(src);
    const query = canonicalise(operationsGenerator(merged));
    return {
      url: joinURL(baseURL, path) + (query ? `?${query}` : ""),
    };
  },
});
