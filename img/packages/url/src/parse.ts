/**
 * `parseUrl` — the inverse of `buildUrl`.
 *
 * It exists because `unpic` requires it: a transformer that cannot parse a URL
 * back into `{width, height, ...}` cannot be registered, and unpic is the single
 * biggest multiplier in this whole effort (one accepted transformer covers React,
 * Vue, Svelte, Solid, Qwik, Astro and Angular at once).
 *
 * The round-trip that has to hold is
 * `buildUrl(parseUrl(u).src, parseUrl(u).transform, cfg) === u`, not
 * `parseUrl(buildUrl(x)).src === x`: building normalises (a leading slash goes
 * away, parameters get sorted), and asking parsing to undo a normalisation would
 * mean the URL carries information it does not.
 */
import { DEFAULT_BASE_URL, type Transform } from "./config.ts";

export interface ParsedUrl {
  pid: string;
  baseUrl: string;
  mode: "endpoint" | "fetch";
  /** decoded: `uploads/mi foto (1).jpg`, not the percent-encoded form */
  src: string;
  /** parameters as they appear on the wire, decoded */
  transform: Transform;
  /** present only on signed URLs; cannot be re-derived without the secret */
  signature?: string;
  expiresAt?: number;
}

const FETCH_PREFIX = "fetch/";
const IS_ABSOLUTE = /^https?(:\/\/|%3a%2f%2f)/i;

/** `null` when the URL is not one of ours. */
export function parseUrl(url: string): ParsedUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url, DEFAULT_BASE_URL);
  } catch {
    return null;
  }

  const m = /^\/i\/([a-z0-9][a-z0-9-]{2,63})\/(.+)$/.exec(parsed.pathname);
  if (!m) return null;
  const [, pid, rest] = m as unknown as [string, string, string];

  let mode: ParsedUrl["mode"] = "endpoint";
  let src: string;
  if (rest.startsWith(FETCH_PREFIX) && IS_ABSOLUTE.test(rest.slice(FETCH_PREFIX.length))) {
    mode = "fetch";
    const target = rest.slice(FETCH_PREFIX.length);
    try {
      src = /^https?%3a/i.test(target) ? decodeURIComponent(target) : target;
    } catch {
      return null;
    }
  } else {
    try {
      src = rest.split("/").map(decodeURIComponent).join("/");
    } catch {
      return null;
    }
  }

  const transform: Transform = {};
  let signature: string | undefined;
  let expiresAt: number | undefined;
  for (const [k, v] of parsed.searchParams) {
    if (k === "s") {
      signature = v;
      continue;
    }
    if (k === "exp") {
      expiresAt = Number(v);
      continue;
    }
    transform[k] = v;
  }

  return {
    pid,
    baseUrl: `${parsed.protocol}//${parsed.host}`,
    mode,
    src,
    transform,
    ...(signature ? { signature } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  };
}
