/**
 * La jerarquia de errores del SDK.
 *
 * Refleja el campo `type` del envelope de error de la API, que existe justamente para
 * esto: `type` es la clase gruesa con la que se hace `catch` selectivo, y `code` es la
 * identidad especifica y estable con la que se decide que hacer. Un integrador escribe
 * `catch (e) { if (e instanceof RateLimitError) …}` sin comparar strings.
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
  /** `X-Request-Id`. **Citalo siempre al reportar un problema**: es la clave del audit log. */
  readonly requestId: string | null;
  readonly status: number | null;
  /** Clase gruesa que devolvio la API (`rate_limit_error`). */
  readonly type: string | null;
  /** Identidad especifica y estable (`insufficient_scope`). Nunca se renombra. */
  readonly code: string | null;
  /** Campo que causo el problema, cuando la API lo puede senalar. */
  readonly param: string | null;
  /** Cuerpo crudo, por si la API dice algo que esta clase todavia no modela. */
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

/** 401 — credencial ausente, invalida, revocada o vencida. */
export class AuthenticationError extends TruoError {}

/** 403 — la credencial existe pero no alcanza (scope, permiso del usuario, o del servicio). */
export class AuthorizationError extends TruoError {}

/** 400/404/409 — el request esta mal, el recurso no existe, o hay conflicto. */
export class InvalidRequestError extends TruoError {}

/** 429. `retryAfterMs` viene de `Retry-After`; el SDK ya lo respeto en sus reintentos. */
export class RateLimitError extends TruoError {
  readonly retryAfterMs: number | null;
  constructor(message: string, opts: ErrorOpts & { retryAfterMs?: number | null } = {}) {
    super(message, opts);
    this.retryAfterMs = opts.retryAfterMs ?? null;
  }
}

/** 5xx — el problema es nuestro. Reintentar tiene sentido. */
export class ApiError extends TruoError {}

/** No hubo respuesta: DNS, TCP, TLS, timeout, o el proceso aborto la request. */
export class ApiConnectionError extends TruoError {}

/** `operations.wait()` termino con la operacion en `failed`. */
export class OperationFailedError extends TruoError {
  readonly operationId: string;
  constructor(message: string, operationId: string, opts: ErrorOpts = {}) {
    super(message, opts);
    this.operationId = operationId;
  }
}

/**
 * `operations.wait()` se quedo sin tiempo. **La operacion sigue corriendo**: el id esta
 * en la excepcion justamente para poder retomarla en vez de volver a lanzarla.
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
 * Construye la excepcion a partir de la respuesta.
 *
 * Se prefiere `type` sobre el status porque el status puede cambiar de significado detras
 * de un proxy (un 502 de Cloudflare no es un `api_error` nuestro), mientras que `type`
 * solo aparece si el cuerpo lo escribio la API. Cuando no hay cuerpo util —justamente el
 * caso del proxy— se cae al status.
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
