/**
 * El transporte. Todo lo que no es "que endpoint llamar" vive aca.
 *
 * El arbol de recursos se regenera con cada cambio del spec; esto no. Esa separacion es
 * deliberada: los reintentos, la idempotencia, el manejo de errores y el cursor son la
 * parte del SDK donde un bug cuesta caro, y no queremos que la reescriba un generador cada
 * vez que la API agrega un endpoint.
 */
import { API_BASE_URL, API_VERSION, getOperation } from "./generated/operations.ts";
import { ApiConnectionError, TruoError, errorFromResponse } from "./errors.ts";
import type { CallArgs, ClientOptions, DeprecationNotice, RawResponse, RequestOptions } from "./types.ts";

const SDK_VERSION = "0.1.0";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;
/** Techo del backoff. Mas alla de esto conviene fallar y que el llamador decida. */
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

/** `Retry-After` viene en segundos o como fecha HTTP. Las dos formas son legales. */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

/**
 * Backoff exponencial con jitter completo.
 *
 * El jitter no es cosmetico: sin el, N clientes que reciben 429 al mismo tiempo reintentan
 * al mismo tiempo y reconstruyen el pico que causo el 429. Randomizar el intervalo entero
 * (y no solo un margen) es lo que los despeina.
 */
function backoffMs(attempt: number): number {
  const ceiling = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt);
  return Math.random() * ceiling;
}

function combineSignals(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const live = signals.filter((s): s is AbortSignal => Boolean(s));
  if (live.length === 0) return undefined;
  if (live.length === 1) return live[0];
  // `AbortSignal.any` existe en Node 20.3+ y en Bun; el fallback cubre runtimes viejos.
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
  /** Un aviso por operacion y no uno por llamada: en un loop seria ruido y se ignoraria. */
  private readonly warnedDeprecations = new Set<string>();

  constructor(opts: ClientOptions = {}) {
    const token = opts.token ?? globalThis.process?.env?.["TRUO_TOKEN"] ?? "";
    if (!token) {
      throw new TruoError(
        "Falta el token. Pasa `new TruoClient({ token })` o defini la variable de entorno TRUO_TOKEN.",
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

  /** Separa los query params de las opciones de request usando las claves del spec. */
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
        throw new TruoError(`Falta el parametro de ruta "${name}" para ${template}.`, {
          code: "validation_failed",
          param: name,
        });
      }
      return encodeURIComponent(String(value));
    });

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      // Un array se repite como clave: `?tag=a&tag=b`, que es lo que la API espera.
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
    if (!meta) throw new TruoError(`Operacion desconocida: ${operationId}`, { code: "not_found" });

    const { query, options } = this.splitParams(args);
    const url = this.buildUrl(meta.path, args.path, query);

    const headers: Record<string, string> = { ...this.baseHeaders, ...lower(options.headers ?? {}) };
    headers["authorization"] = `Bearer ${this.token}`;

    let bodyText: string | undefined;
    if (args.body !== undefined && args.body !== null) {
      bodyText = JSON.stringify(args.body);
      headers["content-type"] = "application/json";
    }

    // Una clave de idempotencia generada por el SDK es lo que hace seguro reintentar un
    // POST: sin ella, un timeout de red obliga a elegir entre no reintentar (y dejar al
    // usuario sin saber si paso) o reintentar (y arriesgar dos VPS). Con ella, el servidor
    // reconoce el segundo intento como el mismo pedido.
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
        // Si quien aborto fue el usuario, no es un problema de red y no se reintenta.
        if (options.signal?.aborted) throw options.signal.reason;
        lastError = new ApiConnectionError(
          `No se pudo llegar a ${this.baseUrl}: ${cause instanceof Error ? cause.message : String(cause)}`,
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
        // El servidor sabe mejor que nosotros cuando volver: si dijo `Retry-After`, se
        // respeta tal cual en vez de aplicarle nuestro backoff por arriba.
        await sleep(retryAfterMs ?? backoffMs(attempt), options.signal);
        continue;
      }
      throw lastError;
    }

    throw lastError ?? new TruoError("Se agotaron los reintentos sin una respuesta.");
  }

  /** Itera una coleccion siguiendo `next_cursor` hasta que `has_more` sea falso. */
  async *paginate<I>(operationId: string, args: Omit<CallArgs, "body">): AsyncGenerator<I, void, undefined> {
    let cursor: string | undefined;
    // Sin techo, un `has_more` que nunca baja (bug del servidor o un cursor que no avanza)
    // deja al cliente girando para siempre. Mil paginas son mas de lo que cualquier cuenta
    // real necesita y muchisimo menos que un cuelgue.
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
          `${operationId} devolvio el mismo cursor dos veces; se corta la paginacion para no girar en vacio.`,
          { code: "invalid_cursor" },
        );
      }
      cursor = result.next_cursor;
    }
    throw new TruoError(`${operationId}: mas de 1000 paginas. Acota la consulta.`, { code: "invalid_cursor" });
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
 * Un 204 no trae cuerpo y un error de un proxy puede traer HTML. Devolver `null` y el
 * texto crudo respectivamente evita que el SDK explote con un `SyntaxError` de JSON que no
 * le dice nada a nadie sobre lo que realmente paso.
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
  const parts = [`[truocloud] La operacion "${info.operationId}" esta deprecada.`];
  if (info.sunset) parts.push(`Deja de existir el ${info.sunset}.`);
  if (info.link) parts.push(`Migracion: ${info.link}`);
  console.warn(parts.join(" "));
}
