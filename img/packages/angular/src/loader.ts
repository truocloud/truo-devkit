/**
 * The loader function, with no Angular runtime attached.
 *
 * Split out from `index.ts` deliberately. `IMAGE_LOADER` is a value import from
 * `@angular/common`, and pulling that in drags Angular's dependency-injection
 * machinery with it — which refuses to load outside an Angular bootstrap ("needs
 * to be compiled using the JIT compiler"). Everything that can actually be wrong
 * about this integration lives in the function below, so it lives where it can be
 * imported, tested and reasoned about on its own.
 */
import type { Transform, TruoImgConfig } from "@truocloud/img";
import { buildUrl } from "@truocloud/img";

/** The subset of Angular's `ImageLoaderConfig` this loader reads. Declared
 *  structurally so this module needs no Angular import at all. */
export interface ImageLoaderConfigLike {
  src: string;
  width?: number;
  isPlaceholder?: boolean;
  loaderParams?: Record<string, unknown>;
}

export interface TruoImageLoaderOptions {
  /** Output format when the template does not ask for one. Defaults to `auto`. */
  format?: string | false;
  /** Parameters added to every URL this loader produces. */
  transform?: Transform;
  /**
   * Width of the LQIP that `NgOptimizedImage` requests when `placeholder` is on.
   * Angular asks for it with `isPlaceholder: true` and expects something tiny.
   */
  placeholderWidth?: number;
}

/** `https://host/i/<pid>` — the endpoint exactly as the console publishes it. */
const ENDPOINT = /^(https?:\/\/[^/]+)\/i\/([a-z0-9][a-z0-9-]{2,63})\/?$/i;

export function parseEndpoint(endpoint: string): TruoImgConfig {
  const m = ENDPOINT.exec(endpoint.trim().replace(/\/+$/, ""));
  if (!m) {
    throw new Error(
      `@truocloud/img-angular: the endpoint should look like https://img.truo.cloud/i/<pid>, got "${endpoint}". ` +
        "You will find it in the console under Images → Endpoint.",
    );
  }
  return { baseUrl: m[1]!, pid: m[2]! };
}

/** The loader function, without the Angular wiring. Exported so it can be tested
 *  and so somebody can provide `IMAGE_LOADER` themselves. */
export function createTruoImageLoader(
  endpoint: string,
  options: TruoImageLoaderOptions = {},
): (config: ImageLoaderConfigLike) => string {
  const config = parseEndpoint(endpoint);
  const format = options.format === undefined ? "auto" : options.format;

  return ({ src, width, isPlaceholder, loaderParams }: ImageLoaderConfigLike): string => {
    // `loaderParams` is Angular's escape hatch for anything the directive does
    // not model. Passing it straight through is what makes gravity, crops and
    // filters reachable without waiting for a new API.
    const extra = (loaderParams?.transform ?? loaderParams ?? {}) as Transform;

    if (isPlaceholder) {
      return buildUrl(
        src,
        { width: options.placeholderWidth ?? 20, blur: 2, quality: 40, format: "webp" },
        config,
      );
    }

    return buildUrl(
      src,
      {
        ...(options.transform ?? {}),
        ...extra,
        ...(width ? { width } : {}),
        ...(format ? { format } : {}),
      },
      config,
    );
  };
}

