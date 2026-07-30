/**
 * Two-call confirmation for destructive actions.
 *
 * The first call to a destructive action does not execute: it returns a summary and a
 * `confirmation_token`. Executing requires a second call carrying that token. The token
 * is an HMAC over the exact arguments with a key that lives only in this server
 * process — so the model cannot forge one, cannot reuse a confirmation for different
 * arguments (changing anything invalidates it), and cannot carry one across a server
 * restart. TTL 5 minutes: a confirmation is a decision, not a standing grant.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TTL_MS = 5 * 60_000;

/** One key per server session, never persisted anywhere. */
const sessionKey = randomBytes(32);

/**
 * Canonical JSON: objects with sorted keys, so `{a,b}` and `{b,a}` produce the same
 * token. Anything non-JSON (undefined, functions) is dropped the same way JSON does.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sign(payload: string, issuedAt: number): string {
  return createHmac("sha256", sessionKey).update(`${issuedAt}.${payload}`).digest("hex").slice(0, 32);
}

export function mintConfirmationToken(args: unknown, now = Date.now()): string {
  return `cft_${now.toString(36)}_${sign(canonicalJson(args), now)}`;
}

export type ConfirmResult = { ok: true } | { ok: false; reason: "expired" | "invalid" };

/**
 * Stateless verification: recompute the HMAC over the arguments actually about to be
 * executed. If the model altered a single argument after the human-visible summary was
 * produced, the signature no longer matches — a confirmation obtained for something
 * small cannot authorize something big.
 */
export function verifyConfirmationToken(token: string, args: unknown, now = Date.now()): ConfirmResult {
  const match = /^cft_([0-9a-z]+)_([0-9a-f]{32})$/.exec(token);
  if (!match) return { ok: false, reason: "invalid" };
  const issuedAt = parseInt(match[1]!, 36);
  if (!Number.isFinite(issuedAt) || now < issuedAt || now - issuedAt > TTL_MS) {
    return { ok: false, reason: "expired" };
  }
  const expected = Buffer.from(sign(canonicalJson(args), issuedAt));
  const got = Buffer.from(match[2]!);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
}
