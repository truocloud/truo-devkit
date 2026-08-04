/**
 * `@truocloud/img-nuxt` — `@nuxt/image` provider for img.truo.cloud.
 *
 * ```ts
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   modules: ["@nuxt/image"],
 *   image: {
 *     providers: {
 *       truocloud: { provider: "@truocloud/img-nuxt", options: { pid: "acme" } },
 *     },
 *     provider: "truocloud",
 *   },
 * });
 * ```
 *
 * The provider contract is one function: given a source and a bag of modifiers,
 * return `{ url }`. `@nuxt/image` has already normalised the modifier names
 * (`width`, `height`, `format`, `quality`, `fit`) by the time it calls us, which
 * is exactly the vocabulary `@truocloud/img` accepts — so this file is a thin
 * adapter and not a second URL builder. That matters: a second builder is a
 * second thing that can disagree with the shared fixture.
 */
import { buildUrl, type Transform, type TruoImgConfig } from "@truocloud/img";

export interface TruoCloudProviderOptions extends Omit<TruoImgConfig, "pid"> {
  /** the tenant's public id — the `<pid>` in `/i/<pid>/…` */
  pid?: string;
  /**
   * Full endpoint, as an alternative to `pid`. Use it with a custom domain.
   * @example "https://images.example.com/i/acme"
   */
  baseURL?: string;
  /** Output format when the caller does not ask for one. Defaults to `auto`. */
  format?: string | false;
}

export interface GetImageContext extends TruoCloudProviderOptions {
  modifiers?: Record<string, unknown>;
}

/** `/i/<pid>` at the end of a baseURL, which is how the endpoint is published. */
const ENDPOINT = /^(https?:\/\/[^/]+)\/i\/([a-z0-9][a-z0-9-]{2,63})\/?$/i;

/**
 * Resolves `{ baseUrl, pid }` from either shape of configuration.
 *
 * Two ways in on purpose: `pid` is what the console shows and what most people
 * will paste, and `baseURL` is what `@nuxt/image` users already expect a
 * provider to take — and the only way to point at a custom domain.
 */
export function resolveEndpoint(options: TruoCloudProviderOptions): TruoImgConfig {
  if (options.baseURL) {
    const m = ENDPOINT.exec(options.baseURL.replace(/\/+$/, ""));
    if (!m) {
      throw new Error(
        `@truocloud/img-nuxt: baseURL should look like https://img.truo.cloud/i/<pid>, got ${options.baseURL}`,
      );
    }
    return { ...options, baseUrl: m[1]!, pid: m[2]! };
  }
  if (!options.pid) {
    throw new Error(
      "@truocloud/img-nuxt: set `pid` (or `baseURL`) in the provider options. " +
        "You will find it in the console under Images → Endpoint.",
    );
  }
  return { ...options, pid: options.pid };
}

export function getImage(src: string, ctx: GetImageContext = {}): { url: string } {
  const config = resolveEndpoint(ctx);
  const format = ctx.format === undefined ? "auto" : ctx.format;
  const modifiers = (ctx.modifiers ?? {}) as Transform;

  return {
    url: buildUrl(
      src,
      {
        // `format` last-but-one so an explicit modifier still wins: `@nuxt/image`
        // puts `format` in modifiers when the template asks for one.
        ...(format ? { format } : {}),
        ...modifiers,
      },
      config,
    ),
  };
}

/**
 * `@nuxt/image` imports the provider module and reads its default export. It is
 * a plain object rather than a call to their `defineProvider` helper so this
 * package does not have to depend on `@nuxt/image` internals — the helper only
 * adds types.
 */
export default { getImage };
