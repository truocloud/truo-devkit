/**
 * Webhook signature verification.
 *
 * Every delivery carries `Truo-Signature: t=<unix seconds>,v1=<hex>` where
 * `v1 = HMAC-SHA256(secret, "<t>." + rawBody)`. The body is signed byte for
 * byte: verify against the **raw** request body, before any JSON parsing or
 * re-serialization, or the signature will never match.
 *
 * Web Crypto only, so it runs the same in Node 20+, Bun, Deno, Workers and the
 * browser — the same places the rest of the SDK does.
 *
 * ```ts
 * import { verifyWebhookSignature } from "@truocloud/sdk";
 *
 * const ok = await verifyWebhookSignature({
 *   secret: process.env.TRUO_WEBHOOK_SECRET!,
 *   body: rawBody,                                  // string or bytes, unparsed
 *   header: req.headers.get("truo-signature")!,
 * });
 * ```
 */

export interface VerifyWebhookOptions {
  /** The `whsec_…` secret returned when the webhook was created or rotated. */
  secret: string;
  /** The raw request body, exactly as received. */
  body: string | Uint8Array;
  /** The `Truo-Signature` header value. */
  header: string;
  /** Reject timestamps further than this from now. Default 300 s. */
  toleranceSeconds?: number;
  /** Override "now" (unix seconds). For tests. */
  now?: number;
}

function parseHeader(header: string): { t: number; v1: string } | null {
  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) {
    const i = kv.indexOf("=");
    if (i === -1) continue;
    parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const t = Number.parseInt(parts.t ?? "", 10);
  const v1 = parts.v1 ?? "";
  if (!Number.isFinite(t) || !/^[0-9a-f]{64}$/.test(v1)) return null;
  return { t, v1 };
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Computes `t=…,v1=…` for a body. Exposed for tests and for building fixtures. */
export async function signWebhookPayload(
  secret: string,
  body: string | Uint8Array,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const bodyBytes = typeof body === "string" ? enc.encode(body) : body;
  const prefix = enc.encode(`${timestamp}.`);
  const data = new Uint8Array(prefix.length + bodyBytes.length);
  data.set(prefix, 0);
  data.set(bodyBytes, prefix.length);
  const mac = await crypto.subtle.sign("HMAC", key, data);
  return `t=${timestamp},v1=${hex(mac)}`;
}

/**
 * `true` only if the signature matches **and** the timestamp is within
 * tolerance. Never throws on a malformed header: a bad signature is `false`,
 * not an exception a handler might forget to catch.
 */
export async function verifyWebhookSignature(opts: VerifyWebhookOptions): Promise<boolean> {
  const parsed = parseHeader(opts.header);
  if (!parsed) return false;
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.t) > (opts.toleranceSeconds ?? 300)) return false;
  const expected = await signWebhookPayload(opts.secret, opts.body, parsed.t);
  return constantTimeEqual(expected.slice(expected.indexOf("v1=") + 3), parsed.v1);
}

/** The body of every delivery. `data` depends on `type`. */
export interface WebhookEvent<T = unknown> {
  id: string;
  object: "event";
  type: string;
  created_at: string;
  data: T;
}
