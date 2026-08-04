/**
 * `@truocloud/img-angular` — `NgOptimizedImage` loader for img.truo.cloud.
 *
 * ```ts
 * import { provideTruoImageLoader } from "@truocloud/img-angular";
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [provideTruoImageLoader("https://img.truo.cloud/i/acme")],
 * });
 * ```
 * ```html
 * <img ngSrc="uploads/photo.jpg" width="800" height="600" priority />
 * ```
 *
 * The signature deliberately mirrors Angular's own `provideImageKitLoader` — the
 * endpoint as a positional string, options second — so that swapping providers is
 * a one-line change and reviewers of the upstream proposal recognise the shape
 * immediately.
 *
 * This file is the only one that imports `@angular/common` as a value; the loader
 * itself lives in `./loader.ts` and needs no Angular runtime.
 */
import { IMAGE_LOADER } from "@angular/common";
import type { Provider } from "@angular/core";
import { createTruoImageLoader, type TruoImageLoaderOptions } from "./loader.ts";

export {
  createTruoImageLoader,
  parseEndpoint,
  type TruoImageLoaderOptions,
  type ImageLoaderConfigLike,
} from "./loader.ts";

/**
 * Registers the loader.
 *
 * Returns `Provider[]` rather than a single provider to match the shape of
 * Angular's built-in loaders, so it drops into the same place in a `providers`
 * array.
 */
export function provideTruoImageLoader(
  endpoint: string,
  options: TruoImageLoaderOptions = {},
): Provider[] {
  return [{ provide: IMAGE_LOADER, useValue: createTruoImageLoader(endpoint, options) }];
}
