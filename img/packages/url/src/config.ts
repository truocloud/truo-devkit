/** Configuration and shared types. */

export interface TruoImgConfig {
  /**
   * The tenant's public id — the `<pid>` in `https://img.truo.cloud/i/<pid>/…`.
   * It is not a secret: it appears in every image URL of the site.
   */
  pid: string;
  /** Origin of the service. Override only for a custom domain or a local test. */
  baseUrl?: string;
  /** Widths used by `srcset()` when the call does not pass its own. */
  widths?: number[];
  /**
   * Upper bound applied by `srcset()` before de-duplicating. It exists so a
   * ladder does not emit several candidates that all resolve to the same image;
   * it is not a security control (the service clamps on its own and says so with
   * `x-img-clamped`).
   */
  maxWidth?: number;
  /**
   * `auto` (the default) decides per source: a relative path is a path on your
   * own origin, an absolute URL somewhere else is proxied, and a URL that is
   * already ours is rewritten in place instead of wrapped again.
   */
  mode?: "auto" | "endpoint" | "fetch";
}

/** What a caller asks for. Unknown keys travel through untouched. */
export type Transform = Record<string, string | number | boolean | null | undefined>;

export const DEFAULT_BASE_URL = "https://img.truo.cloud";

/**
 * Five widths, not eight.
 *
 * The engine caches on the second identical request (`proxy_cache_min_uses 2`),
 * so every width in a ladder costs two transformations before it starts being
 * served from cache. With Next's default `deviceSizes` (8 widths), a page with 5
 * images costs 5 x 8 x 2 = 80 transformations on the first visit, and the free
 * tier's 5.000/month covers about 62 first visits. Five widths cover the real
 * breakpoints and halve that.
 */
export const DEFAULT_WIDTHS = [640, 828, 1200, 1600, 2048];

/** Matches the service's default cap. Only used to de-duplicate ladders. */
export const DEFAULT_MAX_WIDTH = 4096;

export function resolveBaseUrl(cfg: TruoImgConfig): string {
  return (cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}
