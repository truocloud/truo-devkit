/**
 * `@truocloud/img-next` — `next/image` loader for img.truo.cloud.
 *
 * Setup is two lines:
 *
 * ```js
 * // next.config.js
 * module.exports = {
 *   images: { loader: "custom", loaderFile: "./node_modules/@truocloud/img-next/loader.js" },
 * };
 * ```
 * ```bash
 * # .env
 * NEXT_PUBLIC_TRUO_IMG_PID=acme
 * ```
 *
 * **Why `loaderFile` and not the `loader` prop.** The prop takes a function, and
 * a function cannot cross the Server Component boundary — passing one from a
 * server component to `<Image>` fails to serialise. `loaderFile` is resolved at
 * build time by the bundler, so it works from anywhere. Every third-party image
 * provider that supports the App Router does it this way.
 *
 * **Why an environment variable for the pid.** Next inlines `NEXT_PUBLIC_*` into
 * the client bundle at build time, so the loader has the value without a runtime
 * lookup and without a config file it cannot read from the browser.
 */
import { buildUrl, type Transform, type TruoImgConfig } from "@truocloud/img";

/** What Next hands a custom loader. */
export interface NextImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export interface TruoLoaderOptions extends Omit<TruoImgConfig, "pid"> {
  pid?: string;
  /**
   * Output format. Defaults to `"auto"`, which negotiates from the browser's
   * `Accept` header and answers `Vary: Accept`.
   *
   * That is correct HTTP and it is also the fragile part: `Accept` is a very
   * high-cardinality header, and some CDNs ignore `Vary` on images unless you
   * turn it on (Cloudflare calls it "Vary for Images"). If your images sit
   * behind a third-party CDN you did not configure, pin `format: "webp"` — a
   * slightly larger file that is always the right one beats an avif served to a
   * browser that cannot decode it.
   *
   * `false` sends no format at all and keeps the source format.
   */
  format?: string | false;
  /** Extra parameters added to every URL this loader builds. */
  transform?: Transform;
}

/** Reads the pid from the environment the way Next exposes it. */
export function pidFromEnv(): string | undefined {
  // Written out in full rather than indexed: Next replaces the literal
  // `process.env.NEXT_PUBLIC_TRUO_IMG_PID` textually, so a dynamic lookup
  // (`process.env[name]`) silently yields undefined in the browser bundle.
  return typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TRUO_IMG_PID : undefined;
}

/**
 * Builds a loader function. Use this when you want to configure it in code
 * instead of through the environment.
 */
export function createTruoLoader(options: TruoLoaderOptions = {}) {
  const pid = options.pid ?? pidFromEnv();
  if (!pid) {
    throw new Error(
      "@truocloud/img-next: no tenant id. Set NEXT_PUBLIC_TRUO_IMG_PID in your environment, " +
        "or pass `pid` to createTruoLoader(). You will find it in the console under Images → Endpoint.",
    );
  }

  const config: TruoImgConfig = { ...options, pid };
  const format = options.format === undefined ? "auto" : options.format;

  return function truoImageLoader({ src, width, quality }: NextImageLoaderProps): string {
    return buildUrl(
      src,
      {
        ...(options.transform ?? {}),
        width,
        ...(quality ? { quality } : {}),
        ...(format ? { format } : {}),
      },
      config,
    );
  };
}
