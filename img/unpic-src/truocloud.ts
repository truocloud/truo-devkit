/**
 * unpic provider for img.truo.cloud.
 *
 * **This file is not published.** It is the source of an upstream pull request to
 * `ascorbic/unpic`, kept here so it is tested on every commit instead of drifting
 * between the day it is written and the day it is merged.
 *
 * Why unpic goes first out of all the integrations: one accepted transformer
 * covers React, Vue, Svelte, Solid, Qwik, Astro and Angular at once, plus
 * `@unpic/astro`. Nothing else in this effort has that multiplier.
 *
 * ── Turning this into the upstream PR ──────────────────────────────────────
 * `bun run unpic:prepare` writes the upstream-shaped file. The differences are
 * mechanical and the script makes them, so nothing is edited by hand:
 *
 *   1. imports come from `../utils.js` and `../types.js` instead of `unpic/...`;
 *   2. the exports are annotated `URLExtractor<"truocloud">` and friends, which
 *      only typecheck once `"truocloud"` is in the `ImageCdn` union.
 *
 * The rest of the PR is three one-line additions upstream, listed in README.md
 * next to this file.
 */
import {
  createExtractAndGenerate,
  createOperationsHandlers,
  toCanonicalUrlString,
  toUrl,
} from "unpic/utils.js";
import type { ImageFormat, Operations } from "unpic/types.js";

export type TruoCloudFormats = ImageFormat | "gif" | "tiff" | "jxl" | "json";

export interface TruoCloudOperations extends Operations<TruoCloudFormats> {
  /** width in pixels */
  w?: number;
  /** height in pixels */
  h?: number;
  /** quality, 1-100. Defaults to 82 server-side when any transform is present. */
  q?: number;
  /** output format. `auto` negotiates from the `Accept` header. */
  f?: TruoCloudFormats | "auto";
  /** resize behaviour. Also accepts the imgix and ImageKit vocabularies. */
  fit?: "contain" | "cover" | "fill" | "inside" | "outside" | (string & {});
  /** device pixel ratio, up to 3 */
  dpr?: number;
  /** blur radius, up to 100 */
  blur?: number;
  /** gravity for `fit=cover` */
  a?: string;
  /** crop rectangle as `width,height,x,y` */
  crop?: `${number},${number},${number},${number}`;
  ro?: number;
  bg?: string;
  [key: string]: string | number | boolean | undefined;
}

const { operationsGenerator, operationsParser } = createOperationsHandlers<TruoCloudOperations>({
  keyMap: {
    width: "w",
    height: "h",
    format: "f",
    quality: "q",
  },
  // The service answers `jpg`, not `jpeg`. Everything else lines up with unpic's
  // vocabulary already.
  formatMap: { jpeg: "jpg" },
});

/**
 * `/i/<pid>/…` — the only shape this provider handles.
 *
 * The pid pattern is the service's own: 3-64 characters, lowercase alphanumeric
 * and dashes. Matching it rather than just `/i/` keeps the provider from
 * claiming an unrelated URL on a custom domain that happens to have an `/i/`
 * directory.
 */
const DELIVERY_PATH = /^\/i\/[a-z0-9][a-z0-9-]{2,63}\/.+/;

/**
 * Canonical parameter order.
 *
 * The service accepts any order, but every builder in this ecosystem emits them
 * sorted — the TypeScript one, the PHP one in the WordPress plugin, and the
 * service's own `/v1/sign`. Two orderings of the same request are two CDN cache
 * entries for one image, so a URL that came out of unpic has to look like a URL
 * that came out of any of the others.
 */
function sortSearch(url: URL): void {
  const sorted = [...url.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  url.search = "";
  for (const [k, v] of sorted) url.searchParams.append(k, v);
  // The engine does not decode `%2C`, so `crop=60,30,0,0` has to keep its commas
  // literal or the crop is silently ignored — the image comes back, just uncropped.
  url.search = url.search.replace(/%2C/g, ",");
}

export function extract(url: string | URL): { src: string; operations: TruoCloudOperations } | null {
  const src = toUrl(url);
  if (!DELIVERY_PATH.test(src.pathname)) return null;

  const operations = operationsParser(url);
  // `s` and `exp` are an HMAC over this exact path and query. Handing them back
  // as operations would let a caller regenerate a URL carrying a signature that
  // no longer covers it — a 403 at display time, with nothing pointing at why.
  delete operations.s;
  delete operations.exp;

  src.search = "";
  return { src: toCanonicalUrlString(src), operations };
}

export function generate(src: string | URL, operations: TruoCloudOperations): string {
  const url = toUrl(src);
  url.search = operationsGenerator(operations);
  sortSearch(url);
  return toCanonicalUrlString(url);
}

export const transform = createExtractAndGenerate(extract, generate);
