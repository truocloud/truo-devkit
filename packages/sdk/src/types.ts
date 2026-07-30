/** Transport types. Consumed by the generated resource tree. */

/**
 * Options every call accepts, mixed into the same object as the query parameters.
 *
 * Having them live in one bag makes `truo.vps.list({ limit: 5 })` read the way you think
 * it, instead of `truo.vps.list({ query: { limit: 5 } })`. The obvious risk — that the
 * API someday publishes a query param named `signal` — is not left to luck: the generator
 * compares every query param against these keys and **fails the build** if they collide.
 *
 * It is a `type` and not an `interface` for a typing reason, not a style one: TypeScript
 * only gives an implicit index to object types, so an `interface` intersected with the
 * generated query params would not be assignable to `Record<string, unknown>` — which is
 * exactly what the transport needs to tell one from the other.
 */
export type RequestOptions = {
  /** Cancels the request. Combined with the timeout, it does not replace it. */
  signal?: AbortSignal;
  /**
   * Idempotency key. On operations that accept one the SDK generates one per call if you
   * do not pass it, which is what makes retrying a POST safe. Pass your own when you want
   * two attempts *from your process* (not from the same call) to count as one.
   */
  idempotencyKey?: string;
  /** Extra headers. They cannot override `Authorization`. */
  headers?: Record<string, string>;
  /** Timeout for this call. Default: the client's (60 s). */
  timeoutMs?: number;
  /** Retries on 429/5xx and network errors. Default: the client's (2). */
  maxRetries?: number;
}

export interface CallArgs {
  /** Values for the template's `{placeholder}`s, unencoded. */
  path?: Record<string, string | number> | undefined;
  body?: unknown;
  /** Which keys of `params` are query parameters rather than request options. */
  queryKeys?: readonly string[] | undefined;
  params?: (Record<string, unknown> & RequestOptions) | undefined;
}

export type Call = <R>(operationId: string, args: CallArgs) => Promise<R>;

/** Iterates the items of a collection, following the cursor until it is exhausted. */
export type Paginate = <I>(operationId: string, args: Omit<CallArgs, "body">) => AsyncGenerator<I, void, undefined>;

/** A raw response, for the `client.request()` escape hatch. */
export interface RawResponse<T = unknown> {
  status: number;
  headers: Headers;
  requestId: string | null;
  data: T;
}

export interface ClientOptions {
  /** `tc_live_…` token. Without it, the client reads `TRUO_TOKEN` from the environment. */
  token?: string;
  /** Default: the spec's `servers[0].url` (`https://api.truo.cloud`). */
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Headers added to every request. */
  headers?: Record<string, string>;
  /** `fetch` replacement (tests, proxies, instrumentation). */
  fetch?: typeof globalThis.fetch;
  /** Appended to the `User-Agent`. Putting your app's name here helps when you ask for support. */
  userAgent?: string;
  /**
   * Called when the API marks an operation as deprecated. By default it prints a warning
   * to stderr, **once per operation**: if your integration uses something that is going
   * away, you find out by running your own code, not by reading the changelog.
   */
  onDeprecation?: (info: DeprecationNotice) => void;
}

export interface DeprecationNotice {
  operationId: string;
  /** Announcement date (`Deprecation` header). */
  deprecation: string | null;
  /** Cutoff date (`Sunset` header). From then on the operation no longer exists. */
  sunset: string | null;
  /** Link to the changelog with the migration path (`Link; rel="deprecation"` header). */
  link: string | null;
}
