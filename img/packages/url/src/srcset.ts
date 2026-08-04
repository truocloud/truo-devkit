/** Responsive helpers: `srcset`, `sizes`, `lqip`. */
import { buildUrl } from "./build.ts";
import {
  DEFAULT_MAX_WIDTH,
  DEFAULT_WIDTHS,
  type Transform,
  type TruoImgConfig,
} from "./config.ts";

export interface SrcsetOptions {
  widths?: number[];
  transform?: Transform;
}

/**
 * Resolves the width ladder: clamp first, THEN de-duplicate.
 *
 * The order is the whole point. `[2048, 4096, 8192]` against a 4096 cap becomes
 * `[2048, 4096, 4096]` and de-duplicating after leaves two candidates. Doing it
 * the other way emits two identical URLs with different descriptors: the browser
 * picks the `8192w` one believing it is larger, downloads exactly the same bytes,
 * and we pay for a second cache entry that can never be a hit.
 */
export function resolveWidths(widths: number[], maxWidth: number): number[] {
  const clamped = widths
    .filter((w) => Number.isFinite(w) && w > 0)
    .map((w) => Math.min(Math.round(w), maxWidth));
  return [...new Set(clamped)].sort((a, b) => a - b);
}

/**
 * Builds a `srcset` attribute.
 *
 * ```ts
 * srcset("uploads/photo.jpg", { transform: { format: "auto" } }, cfg)
 * // …?f=auto&w=640 640w, …?f=auto&w=828 828w, …
 * ```
 */
export function srcset(src: string, opts: SrcsetOptions | undefined, cfg: TruoImgConfig): string {
  const widths = resolveWidths(
    opts?.widths ?? cfg.widths ?? DEFAULT_WIDTHS,
    cfg.maxWidth ?? DEFAULT_MAX_WIDTH,
  );
  return widths
    .map((w) => `${buildUrl(src, { ...(opts?.transform ?? {}), width: w }, cfg)} ${w}w`)
    .join(", ");
}

/**
 * Builds a `sizes` attribute from breakpoint pairs.
 *
 * `sizes` matters more than most people think: with a `srcset` and no `sizes`,
 * the browser assumes `100vw` and downloads the largest candidate on a phone.
 * That is the single most common way a "responsive images" setup ends up slower
 * than the plain `<img>` it replaced.
 *
 * ```ts
 * sizes([[768, "100vw"], [1200, "50vw"]], "33vw")
 * // "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
 * ```
 */
export function sizes(breakpoints: Array<[number, string]>, fallback = "100vw"): string {
  const parts = [...breakpoints]
    .sort((a, b) => a[0] - b[0])
    .map(([px, size]) => `(max-width: ${px}px) ${size}`);
  parts.push(fallback);
  return parts.join(", ");
}

export interface LqipOptions {
  /** width of the placeholder, in pixels. 16-24 is the useful range. */
  width?: number;
  blur?: number;
  quality?: number;
}

/**
 * URL of a low-quality placeholder.
 *
 * Deliberately a URL and not a data URI: producing a data URI means downloading
 * the bytes, and `buildUrl` has to stay synchronous for the Next and Angular
 * loaders. `lqipDataUrl()` is the async one, and it is server-only.
 */
export function lqip(src: string, opts: LqipOptions | undefined, cfg: TruoImgConfig): string {
  return buildUrl(
    src,
    { width: opts?.width ?? 20, blur: opts?.blur ?? 2, quality: opts?.quality ?? 40, format: "webp" },
    cfg,
  );
}

/**
 * Inlineable `data:` URI of the placeholder. Fetches the image, so it belongs in
 * a build step or a server component — never in browser code, where it would add
 * a round trip to the critical path to save one.
 */
export async function lqipDataUrl(
  src: string,
  opts: LqipOptions | undefined,
  cfg: TruoImgConfig,
): Promise<string> {
  const res = await fetch(lqip(src, opts, cfg));
  if (!res.ok) throw new Error(`@truocloud/img: LQIP fetch failed with ${res.status}`);
  const type = res.headers.get("content-type") ?? "image/webp";
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `data:${type};base64,${btoa(binary)}`;
}
