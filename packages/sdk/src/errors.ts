/**
 * The SDK's error hierarchy.
 *
 * It mirrors the `type` field of the API's error envelope, which exists precisely for
 * this: `type` is the coarse class you `catch` selectively on, and `code` is the specific,
 * stable identity you use to decide what to do. An integrator writes
 * `catch (e) { if (e instanceof RateLimitError) …}` without comparing strings.
 */

export interface ApiErrorBody {
  type?: string;
  code?: string;
  message?: string;
  param?: string | null;
  request_id?: string | null;
}

export interface ErrorOpts {
  status?: number | null;
  requestId?: string | null;
  type?: string | null;
  code?: string | null;
  param?: string | null;
  raw?: unknown;
  cause?: unknown;
}

export class TruoError extends Error {
  /** `X-Request-Id`. **Always quote it when reporting a problem**: it is the audit log key. */
  readonly requestId: string | null;
  readonly status: number | null;
  /** Coarse class the API returned (`rate_limit_error`). */
  readonly type: string | null;
  /** Specific, stable identity (`insufficient_scope`). Never renamed. */
  readonly code: string | null;
  /** The field that caused the problem, when the API can point at one. */
  readonly param: string | null;
  /** Raw body, in case the API says something this class does not model yet. */
  readonly raw: unknown;

  constructor(message: string, opts: ErrorOpts = {}) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = new.target.name;
    this.status = opts.status ?? null;
    this.requestId = opts.requestId ?? null;
    this.type = opts.type ?? null;
    this.code = opts.code ?? null;
    this.param = opts.param ?? null;
    this.raw = opts.raw ?? null;
  }

  override toString(): string {
    const bits = [this.name, this.code ? `[${this.code}]` : "", this.message].filter(Boolean);
    return bits.join(" ") + (this.requestId ? ` (request_id: ${this.requestId})` : "");
  }
}

/** 401 — credential missing, invalid, revoked, or expired. */
export class AuthenticationError extends TruoError {}

/** 403 — the credential exists but is not enough (scope, user permission, or service permission). */
export class AuthorizationError extends TruoError {}

/** 400/404/409 — the request is malformed, the resource does not exist, or there is a conflict. */
export class InvalidRequestError extends TruoError {}

/** 429. `retryAfterMs` comes from `Retry-After`; the SDK already honored it in its retries. */
export class RateLimitError extends TruoError {
  readonly retryAfterMs: number | null;
  constructor(message: string, opts: ErrorOpts & { retryAfterMs?: number | null } = {}) {
    super(message, opts);
    this.retryAfterMs = opts.retryAfterMs ?? null;
  }
}

/** 5xx — the problem is on our side. Retrying makes sense. */
export class ApiError extends TruoError {}

/** No response at all: DNS, TCP, TLS, timeout, or the process aborted the request. */
export class ApiConnectionError extends TruoError {}

/** `operations.wait()` finished with the operation in `failed`. */
export class OperationFailedError extends TruoError {
  readonly operationId: string;
  constructor(message: string, operationId: string, opts: ErrorOpts = {}) {
    super(message, opts);
    this.operationId = operationId;
  }
}

/**
 * `operations.wait()` ran out of time. **The operation is still running**: the id is on
 * the exception precisely so you can resume it instead of starting it again.
 */
export class OperationTimeoutError extends TruoError {
  readonly operationId: string;
  constructor(message: string, operationId: string) {
    super(message);
    this.operationId = operationId;
  }
}

const BY_TYPE: Record<string, typeof TruoError> = {
  authentication_error: AuthenticationError,
  authorization_error: AuthorizationError,
  invalid_request_error: InvalidRequestError,
  rate_limit_error: RateLimitError,
  api_error: ApiError,
};

function byStatus(status: number): typeof TruoError {
  if (status === 401) return AuthenticationError;
  if (status === 403) return AuthorizationError;
  if (status === 429) return RateLimitError;
  if (status >= 500) return ApiError;
  if (status >= 400) return InvalidRequestError;
  return TruoError;
}

/**
 * Builds the exception from the response.
 *
 * `type` is preferred over the status because the status can change meaning behind a
 * proxy (a 502 from Cloudflare is not an `api_error` of ours), while `type` only shows up
 * if the body was written by the API. When there is no useful body — exactly the proxy
 * case — it falls back to the status.
 */
export function errorFromResponse(
  status: number,
  body: unknown,
  requestId: string | null,
  retryAfterMs: number | null = null,
): TruoError {
  const err = (body as { error?: ApiErrorBody })?.error;
  const Ctor = (err?.type && BY_TYPE[err.type]) || byStatus(status);
  const message =
    err?.message ??
    (typeof body === "string" && body.trim() ? body.trim().slice(0, 300) : `HTTP ${status}`);

  const opts = {
    status,
    requestId: err?.request_id ?? requestId,
    type: err?.type ?? null,
    code: err?.code ?? null,
    param: err?.param ?? null,
    raw: body,
  };

  if (Ctor === RateLimitError) return new RateLimitError(message, { ...opts, retryAfterMs });
  return new Ctor(message, opts);
}
