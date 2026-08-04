/**
 * Encoding. Every rule here exists because two reasonable implementations
 * disagree, and the disagreement is silent.
 */

/**
 * RFC 3986 percent-encoding: everything except `A-Za-z0-9-._~`.
 *
 * This is PHP's `rawurlencode`. JavaScript's `encodeURIComponent` is *not* the
 * same function — it leaves `!'()*` alone. So `mi foto (1).jpg`, which is
 * literally how WordPress names a duplicated upload, comes out as
 * `mi%20foto%20(1).jpg` from JS and `mi%20foto%20%281%29.jpg` from PHP: two
 * different URLs, two CDN cache entries, and two different signatures for the
 * same file. The strict form wins because the riskier implementation (the
 * plugin) then gets it from a builtin.
 */
export function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Encodes a query value, keeping the comma literal.
 *
 * The comma is legal in a query (RFC 3986 sub-delims) and the transformation
 * engine does **not** decode `%2C`: with the comma escaped it ignores
 * `crop=60,30,0,0` in silence, which is the worst possible failure — the image
 * comes back, just not cropped. Both `URLSearchParams.toString()` and PHP's
 * `http_build_query` escape it, so both have to undo it.
 *
 * Note the asymmetry with `canonicalQuery()` in the signing module, which does
 * NOT keep the comma literal. That is not an oversight: the wire and the
 * signature payload are two different serialisations, and the service treats
 * them that way too.
 */
export function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%2C/g, ",");
}

/** Encodes a path, keeping `/` as a separator and encoding each segment. */
export function encodePath(path: string): string {
  return path.split("/").map(encodeSegment).join("/");
}
