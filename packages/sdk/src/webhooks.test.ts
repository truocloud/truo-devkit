import { describe, expect, test } from "bun:test";
import { signWebhookPayload, verifyWebhookSignature } from "./webhooks.ts";

describe("verifyWebhookSignature", () => {
  const secret = "whsec_test";
  const body = '{"id":"evt_1","object":"event","type":"webhook.ping","created_at":"2026-09-16T00:00:00.000Z","data":{}}';

  test("accepts a signature made with the same secret over the raw body", async () => {
    const header = await signWebhookPayload(secret, body, 1_760_000_000);
    expect(header).toMatch(/^t=1760000000,v1=[0-9a-f]{64}$/);
    expect(await verifyWebhookSignature({ secret, body, header, now: 1_760_000_010 })).toBe(true);
    // Bytes work the same as the string.
    expect(await verifyWebhookSignature({ secret, body: new TextEncoder().encode(body), header, now: 1_760_000_010 })).toBe(true);
  });

  test("rejects another secret, a re-serialized body, a stale timestamp and garbage", async () => {
    const header = await signWebhookPayload(secret, body, 1_760_000_000);
    expect(await verifyWebhookSignature({ secret: "whsec_other", body, header, now: 1_760_000_010 })).toBe(false);
    expect(await verifyWebhookSignature({ secret, body: JSON.stringify(JSON.parse(body), null, 2), header, now: 1_760_000_010 })).toBe(false);
    expect(await verifyWebhookSignature({ secret, body, header, now: 1_760_000_000 + 600 })).toBe(false);
    expect(await verifyWebhookSignature({ secret, body, header: "nope" })).toBe(false);
  });

  test("matches the server's reference implementation (node:crypto HMAC over `t.body`)", async () => {
    const { createHmac } = await import("node:crypto");
    const t = 1_760_000_000;
    const mac = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    expect(await verifyWebhookSignature({ secret, body, header: `t=${t},v1=${mac}`, now: t })).toBe(true);
  });
});
