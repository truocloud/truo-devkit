/** `buildUrl` — the one function everything else is built on. */
import { DEFAULT_BASE_URL, resolveBaseUrl, type Transform, type TruoImgConfig } from "./config.ts";
import { encodePath, encodeSegment, encodeValue } from "./encode.ts";
import { canonicalName } from "./names.ts";

/** Sources with no origin to fetch: wrapping them produces a URL nobody can serve. */
const OPAQUE = /^(data|blob):/i;
const ABSOLUTE = /^https?:\/\//i;

/**
 * Serialises a transform into the canonical query.
 *
 * Three rules, and all three are about two builders agreeing rather than about
 * the service, which accepts every variant:
 *  - names are translated to their canonical form (`width` -> `w`), values are
 *    NOT (`fit=crop` travels as-is and the service maps it to `cover`);
 *  - `true` becomes `1` and `false` drops the parameter — two ways of writing
 *    the same request are two CDN cache entries for the same image;
 *  - the output is sorted by name, so the caller's object key order cannot leak
 *    into the URL. PHP arrays and JS objects both preserve insertion order, and
 *    their callers do not write keys in the same order.
 */
export function buildQuery(transform: Transform | undefined): string {
  if (!transform) return "";
  const pairs: [string, string][] = [];

  for (const [rawName, rawValue] of Object.entries(transform)) {
    if (rawValue === null || rawValue === undefined || rawValue === "") continue;
    if (rawValue === false) continue;
    const name = canonicalName(rawName) ?? rawName.trim().toLowerCase();
    const value = rawValue === true ? "1" : String(rawValue);
    pairs.push([name, value]);
  }

  // Last writer wins on a repeated name. The service keeps the FIRST one, so
  // emitting both would make the URL mean something the caller did not ask for.
  const merged = new Map(pairs);
  return [...merged.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${encodeSegment(k)}=${encodeValue(v)}`)
    .join("&");
}

/** Where a source lands, before any encoding. */
interface Resolved {
  /** the path after `/i/<pid>/`, already encoded */
  rest: string;
  /** parameters that were already glued to the source (idempotent rewrite) */
  existing: URLSearchParams | null;
  /** the pid to use — normally the config's, but an already-ours URL carries its own */
  pid: string;
}

function resolveSource(src: string, cfg: TruoImgConfig, baseUrl: string): Resolved | null {
  const mode = cfg.mode ?? "auto";

  // Already one of ours. This matters more than it looks: WordPress filters and
  // framework loaders run over the same markup twice more often than anyone
  // expects, and wrapping twice gives
  // `/i/acme/fetch/https%3A%2F%2Fimg.truo.cloud%2Fi%2Facme%2F…` — a URL that
  // works, costs double, and is impossible to read in a bug report.
  if (mode !== "fetch" && ABSOLUTE.test(src) && src.toLowerCase().startsWith(`${baseUrl.toLowerCase()}/i/`)) {
    const parsed = new URL(src);
    const m = /^\/i\/([^/]+)\/(.+)$/.exec(parsed.pathname);
    if (m) return { rest: m[2]!, existing: parsed.searchParams, pid: m[1]! };
  }

  if (mode === "fetch" || (mode === "auto" && ABSOLUTE.test(src))) {
    // The whole source URL is ONE segment: its slashes have to be `%2F` or the
    // service would split it into path segments and read the `https://` as
    // traversal.
    return { rest: `fetch/${encodeSegment(src)}`, existing: null, pid: cfg.pid };
  }

  const clean = src.replace(/^\/+/, "");
  if (clean === "") return null;
  return { rest: encodePath(clean), existing: null, pid: cfg.pid };
}

/**
 * Builds a delivery URL.
 *
 * ```ts
 * buildUrl("uploads/photo.jpg", { width: 800, format: "auto" }, { pid: "acme" })
 * // https://img.truo.cloud/i/acme/uploads/photo.jpg?f=auto&w=800
 * ```
 *
 * Synchronous on purpose: `next/image`'s `loaderFile` and Angular's
 * `IMAGE_LOADER` both require a synchronous function, so an async builder could
 * not be used by two of the four integrations this package exists for.
 */
export function buildUrl(src: string, transform?: Transform, cfg?: TruoImgConfig): string {
  if (!cfg?.pid) throw new Error("@truocloud/img: `pid` is required");
  if (OPAQUE.test(src)) return src;

  const baseUrl = resolveBaseUrl(cfg);
  const resolved = resolveSource(src, cfg, baseUrl);
  if (!resolved) return src;

  // Parameters already on the URL are the floor; the explicit call is the
  // override. The caller asking now knows more than the markup did.
  let merged: Transform | undefined = transform;
  if (resolved.existing) {
    const carried: Transform = {};
    for (const [k, v] of resolved.existing) {
      // A signature covers a specific path and query: re-deriving it is not
      // possible here (the secret is server-side), so carrying it over would
      // produce a URL that 403s. Dropping it is the honest failure.
      if (k === "s" || k === "exp") continue;
      carried[k] = v;
    }
    merged = { ...carried, ...(transform ?? {}) };
  }

  const query = buildQuery(merged);
  return `${baseUrl}/i/${resolved.pid}/${resolved.rest}${query ? `?${query}` : ""}`;
}

/** The default origin, exported so loaders do not hard-code the string. */
export { DEFAULT_BASE_URL };
