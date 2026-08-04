/**
 * The file `next.config.js` points at.
 *
 * Next's `loaderFile` contract is narrow and unforgiving: the module must have a
 * **default export** that is a synchronous function taking `{ src, width, quality }`
 * and returning a string. A named export, or an async function, fails at build
 * time with an error that does not say which of the two rules was broken.
 *
 * The loader is created lazily, on the first call, rather than at module scope.
 * Building it eagerly would throw during Next's config load if the environment
 * variable were missing — before Next has printed anything — and the developer
 * would see a stack trace with no mention of images.
 */
import { createTruoLoader, type NextImageLoaderProps } from "./index.ts";

let loader: ReturnType<typeof createTruoLoader> | null = null;

export default function truoImageLoader(props: NextImageLoaderProps): string {
  loader ??= createTruoLoader();
  return loader(props);
}
