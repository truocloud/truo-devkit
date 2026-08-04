/**
 * `@truocloud/img/sign` — signed URLs. **Server-side only.**
 *
 * A separate entrypoint on purpose: the `exports` map has two entries, so a
 * bundler only pulls this file into a browser bundle if somebody imports it by
 * name. That is a real boundary — tree-shaking cannot accidentally drag it in —
 * but it is the only one. It does NOT stop a developer who deliberately imports
 * it in client code from shipping the secret, and no packaging trick can.
 *
 * An earlier version of this file claimed the opposite: that a `node:crypto`
 * import would make such a build fail loudly. It was measured and it is not
 * true — bundlers disagree (webpack 5 errors, Bun's browser target silently
 * polyfills it into ~530 KB). So there is no `node:crypto` here at all: signing
 * uses WebCrypto, which is global in Node 20+, Bun, Deno, Workers and browsers.
 * One implementation, no polyfill, nothing to get wrong.
 *
 * ```ts
 * import { signUrl } from "@truocloud/img/sign";
 *
 * const url = await signUrl(img.url("uploads/private.jpg", { width: 800 }), {
 *   secret: process.env.TRUO_IMG_SECRET!,
 * });
 * ```
 */

/** Signs a message with HMAC-SHA256 and returns base64url. */
export type Signer = (secret: string, message: string) => Promise<string>;

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * WebCrypto. The only signer, and the default.
 *
 * `crypto.subtle` is global in Node 20+ (this package requires it), Bun, Deno,
 * Cloudflare Workers and browsers — so there is nowhere a signed URL is
 * legitimately produced that needs anything else. The `Signer` type stays
 * exported for an exotic runtime, but a second built-in implementation would
 * only be a second thing that has to agree byte for byte with the service.
 */
export function webSigner(): Signer {
  return async (secret, message) => {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message))));
  };
}

/**
 * Canonical query used INSIDE the signature payload.
 *
 * Not the same serialisation as the wire, and the difference is deliberate:
 * here the comma is `%2C` (plain `encodeURIComponent` on both sides), while the
 * URL keeps it literal because the engine does not decode `%2C`. The service
 * builds the payload from the *decoded* parameters, so both ends agree as long
 * as both encode from the decoded form — which is what this does.
 *
 * Sorted by name and then by value, `s` excluded, and anything starting with `_`
 * excluded (those are the service's own internal parameters).
 */
export function canonicalQuery(params: URLSearchParams): string {
  const entries: [string, string][] = [];
  for (const [k, v] of params) {
    if (k === "s" || k.startsWith("_")) continue;
    entries.push([k, v]);
  }
  entries.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

export interface SignOptions {
  secret: string;
  /** seconds from now. Omit for a URL that does not expire — the normal case for
   *  static HTML, a CMS or anything a CDN will hold on to. */
  ttl?: number;
  /** absolute expiry, in seconds since the epoch. Wins over `ttl`. */
  expiresAt?: number;
  signer?: Signer;
  /** for tests: fixed clock. */
  now?: number;
}

/**
 * Signs a delivery URL built by `buildUrl`.
 *
 * The payload is `"v2\n" + pid + "\n" + pathname + "\n" + canonicalQuery`.
 * **The pathname is in it**, which is the whole reason this version exists: in
 * this contract the path *is* the source image, so signing only the query would
 * leave the signature decorative — anyone could swap the file and keep it valid.
 *
 * `exp` and `s` are appended at the end, in that order, after the sorted
 * parameters. That is what the service's own `/v1/sign` emits, and a signed URL
 * is compared byte for byte or not at all.
 */
export async function signUrl(url: string, opts: SignOptions): Promise<string> {
  const parsed = new URL(url);
  const m = /^\/i\/([^/]+)\//.exec(parsed.pathname);
  if (!m) throw new Error(`@truocloud/img/sign: not a delivery URL: ${parsed.pathname}`);
  const pid = m[1]!;

  const params = new URLSearchParams(parsed.search);
  params.delete("s");

  const expiresAt =
    opts.expiresAt ?? (opts.ttl ? Math.floor((opts.now ?? Date.now()) / 1000) + opts.ttl : null);
  if (expiresAt !== null) params.set("exp", String(expiresAt));

  const signer = opts.signer ?? webSigner();
  const payload = `v2\n${pid}\n${parsed.pathname}\n${canonicalQuery(params)}`;
  params.set("s", await signer(opts.secret, payload));

  // `params.toString()` escapes the comma; the wire carries it literal. Same
  // asymmetry the builder already has to undo.
  return `${parsed.origin}${parsed.pathname}?${params.toString().replace(/%2C/g, ",")}`;
}
