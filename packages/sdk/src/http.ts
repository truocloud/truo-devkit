/**
 * The transport. Everything that is not "which endpoint to call" lives here.
 *
 * The resource tree is regenerated on every spec change; this is not. That separation is
 * deliberate: retries, idempotency, error handling and the cursor are the part of the SDK
 * where a bug is expensive, and we do not want a generator rewriting them every time the
 * API adds an endpoint.
 */
import { API_BASE_URL, API_VERSION, getOperation } from "./generated/operations.ts";
import { ApiConnectionError, TruoError, errorFromResponse } from "./errors.ts";
import type { CallArgs, ClientOptions, DeprecationNotice, RawResponse, RequestOptions } from "./types.ts";

const SDK_VERSION = "0.1.0";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;
/** Backoff ceiling. Beyond this it is better to fail and let the caller decide. */
const MAX_BACKOFF_MS = 8_000;

const RETRIABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal!.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** `Retry-After` comes in seconds or as an HTTP date. Both forms are legal. */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

/**
 * Exponential backoff with full jitter.
 *
 * The jitter is not cosmetic: without it, N clients that get a 429 at the same time retry
 * at the same time and rebuild the spike that caused the 429. Randomizing the whole
 * interval (not just a margin) is what spreads them out.
 */
function backoffMs(attempt: number): number {
  const ceiling = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt);
  return Math.random() * ceiling;
}

function combineSignals(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const live = signals.filter((s): s is AbortSignal => Boolean(s));
  if (live.length === 0) return undefined;
  if (live.length === 1) return live[0];
  // `AbortSignal.any` exists in Node 20.3+ and in Bun; the fallback covers older runtimes.
  const any = (AbortSignal as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (any) return any(live);
  const ctrl = new AbortController();
  for (const s of live) {
    if (s.aborted) {
      ctrl.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}

export class Transport {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly baseHeaders: Record<string, string>;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly onDeprecation: (info: DeprecationNotice) => void;
  /** One warning per operation, not one per call: in a loop it would be noise and get ignored. */
  private readonly warnedDeprecations = new Set<string>();

  constructor(opts: ClientOptions = {}) {
    const token = opts.token ?? globalThis.process?.env?.["TRUO_TOKEN"] ?? "";
    if (!token) {
      throw new TruoError(
        "Missing token. Pass `new TruoClient({ token })` or set the TRUO_TOKEN environment variable.",
        { code: "missing_credentials" },
      );
    }
    this.token = token;
    this.baseUrl = (opts.baseUrl ?? globalThis.process?.env?.["TRUO_BASE_URL"] ?? API_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.onDeprecation = opts.onDeprecation ?? defaultDeprecationWarning;
    this.baseHeaders = {
      accept: "application/json",
      "user-agent": `truocloud-sdk/${SDK_VERSION} (openapi ${API_VERSION})${
        opts.userAgent ? ` ${opts.userAgent}` : ""
      }`,
      ...lower(opts.headers ?? {}),
    };
  }

  /** Splits query params from request options using the keys declared in the spec. */
  private splitParams(args: CallArgs): { query: Record<string, unknown>; options: RequestOptions } {
    const params = args.params ?? {};
    const queryKeys = new Set(args.queryKeys ?? []);
    const query: Record<string, unknown> = {};
    const options: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (queryKeys.has(k)) query[k] = v;
      else options[k] = v;
    }
    return { query, options: options as RequestOptions };
  }

  buildUrl(template: string, path: Record<string, string | number> | undefined, query: Record<string, unknown>): string {
    const filled = template.replace(/\{([^}]+)\}/g, (_, name: string) => {
      const value = path?.[name];
      if (value === undefined || value === null || value === "") {
        throw new TruoError(`Missing path parameter "${name}" for ${template}.`, {
          code: "validation_failed",
          param: name,
        });
      }
      return encodeURIComponent(String(value));
    });

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      // An array repeats the key: `?tag=a&tag=b`, which is what the API expects.
      if (Array.isArray(value)) for (const v of value) search.append(key, String(v));
      else search.append(key, String(value));
    }
    const qs = search.toString();
    return `${this.baseUrl}${filled}${qs ? `?${qs}` : ""}`;
  }

  async call<R>(operationId: string, args: CallArgs): Promise<R> {
    const res = await this.request<R>(operationId, args);
    return res.data;
  }

  async request<R>(operationId: string, args: CallArgs): Promise<RawResponse<R>> {
    const meta = getOperation(operationId);
    if (!meta) throw new TruoError(`Unknown operation: ${operationId}`, { code: "not_found" });

    const { query, options } = this.splitParams(args);
    const url = this.buildUrl(meta.path, args.path, query);

    const headers: Record<string, string> = { ...this.baseHeaders, ...lower(options.headers ?? {}) };
    headers["authorization"] = `Bearer ${this.token}`;

    let bodyText: string | undefined;
    if (args.body !== undefined && args.body !== null) {
      bodyText = JSON.stringify(args.body);
      headers["content-type"] = "application/json";
    }

    // An SDK-generated idempotency key is what makes retrying a POST safe: without it, a
    // network timeout forces a choice between not retrying (leaving the user unsure
    // whether it happened) or retrying (and risking two VPS). With it, the server
    // recognizes the second attempt as the same request.
    const idempotencyKey =
      options.idempotencyKey ?? (meta.idempotent ? `sdk_${randomId()}` : undefined);
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

    const canRetry = meta.method === "GET" || meta.method === "HEAD" || Boolean(idempotencyKey);
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;

    let lastError: TruoError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signal = combineSignals([options.signal, timeoutSignal]);

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: meta.method,
          headers,
          ...(bodyText !== undefined ? { body: bodyText } : {}),
          ...(signal ? { signal } : {}),
        });
      } catch (cause) {
        // If it was the user who aborted, it is not a network problem and is not retried.
        if (options.signal?.aborted) throw options.signal.reason;
        lastError = new ApiConnectionError(
          `Could not reach ${this.baseUrl}: ${cause instanceof Error ? cause.message : String(cause)}`,
          { code: timeoutSignal.aborted ? "timeout" : "connection_failed", cause },
        );
        if (canRetry && attempt < maxRetries) {
          await sleep(backoffMs(attempt), options.signal);
          continue;
        }
        throw lastError;
      }

      const requestId = response.headers.get("x-request-id");
      this.noteDeprecation(operationId, response.headers);

      if (response.ok) {
        return {
          status: response.status,
          headers: response.headers,
          requestId,
          data: (await readBody(response)) as R,
        };
      }

      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      const body = await readBody(response);
      lastError = errorFromResponse(response.status, body, requestId, retryAfterMs);

      const retriable = RETRIABLE_STATUS.has(response.status);
      if (retriable && canRetry && attempt < maxRetries) {
        // The server knows better than we do when to come back: if it said `Retry-After`,
        // it is honored as-is instead of layering our backoff on top.
        await sleep(retryAfterMs ?? backoffMs(attempt), options.signal);
        continue;
      }
      throw lastError;
    }

    throw lastError ?? new TruoError("Retries exhausted without a response.");
  }

  /** Iterates a collection following `next_cursor` until `has_more` is false. */
  async *paginate<I>(operationId: string, args: Omit<CallArgs, "body">): AsyncGenerator<I, void, undefined> {
    let cursor: string | undefined;
    // Without a ceiling, a `has_more` that never goes down (a server bug or a cursor that
    // does not advance) leaves the client spinning forever. A thousand pages is more than
    // any real account needs and a lot less than a hang.
    for (let page = 0; page < 1000; page++) {
      const params = { ...(args.params ?? {}), ...(cursor ? { cursor } : {}) };
      const result = (await this.call<{
        data?: I[];
        has_more?: boolean;
        next_cursor?: string | null;
      }>(operationId, { ...args, params, queryKeys: [...(args.queryKeys ?? []), "cursor"] })) ?? {};

      for (const item of result.data ?? []) yield item;

      if (!result.has_more || !result.next_cursor) return;
      if (result.next_cursor === cursor) {
        throw new TruoError(
          `${operationId} returned the same cursor twice; stopping pagination to avoid spinning in place.`,
          { code: "invalid_cursor" },
        );
      }
      cursor = result.next_cursor;
    }
    throw new TruoError(`${operationId}: more than 1000 pages. Narrow the query.`, { code: "invalid_cursor" });
  }

  private noteDeprecation(operationId: string, headers: Headers): void {
    const deprecation = headers.get("deprecation");
    const sunset = headers.get("sunset");
    if (!deprecation && !sunset) return;
    if (this.warnedDeprecations.has(operationId)) return;
    this.warnedDeprecations.add(operationId);
    const link = headers.get("link");
    this.onDeprecation({
      operationId,
      deprecation,
      sunset,
      link: link ? (/<([^>]+)>/.exec(link)?.[1] ?? link) : null,
    });
  }
}

/**
 * A 204 carries no body and a proxy error can carry HTML. Returning `null` and the raw
 * text respectively keeps the SDK from blowing up with a JSON `SyntaxError` that tells
 * nobody anything about what actually happened.
 */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("json")) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function lower(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
}

function randomId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid.replace(/-/g, "");
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function defaultDeprecationWarning(info: DeprecationNotice): void {
  const parts = [`[truocloud] Operation "${info.operationId}" is deprecated.`];
  if (info.sunset) parts.push(`It goes away on ${info.sunset}.`);
  if (info.link) parts.push(`Migration: ${info.link}`);
  console.warn(parts.join(" "));
}
