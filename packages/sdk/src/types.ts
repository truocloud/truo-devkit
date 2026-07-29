/** Tipos del transporte. Los consume el arbol de recursos generado. */

/**
 * Opciones que acepta cualquier llamada, mezcladas en el mismo objeto que los parametros
 * de consulta.
 *
 * Que convivan en una sola bolsa hace que `truo.vps.list({ limit: 5 })` se lea como se
 * piensa, en vez de `truo.vps.list({ query: { limit: 5 } })`. El riesgo obvio —que la API
 * publique algun dia un query param llamado `signal`— no queda librado a la suerte: el
 * generador compara cada query param contra estas claves y **falla el build** si chocan.
 *
 * Es un `type` y no un `interface` por una razon de tipos, no de estilo: TypeScript solo
 * le da indice implicito a los tipos-objeto, asi que una `interface` intersectada con los
 * query params generados no seria asignable a `Record<string, unknown>` — que es
 * justamente lo que el transporte necesita para separar unos de otros.
 */
export type RequestOptions = {
  /** Cancela la request. Se combina con el timeout, no lo reemplaza. */
  signal?: AbortSignal;
  /**
   * Clave de idempotencia. En las operaciones que la aceptan el SDK genera una sola si no
   * se pasa, que es lo que vuelve seguro reintentar un POST. Pasa la tuya cuando quieras
   * que dos intentos *de tu proceso* (no de la misma llamada) cuenten como uno.
   */
  idempotencyKey?: string;
  /** Headers extra. No pueden pisar `Authorization`. */
  headers?: Record<string, string>;
  /** Timeout de esta llamada. Default: el del cliente (60 s). */
  timeoutMs?: number;
  /** Reintentos ante 429/5xx y errores de red. Default: el del cliente (2). */
  maxRetries?: number;
}

export interface CallArgs {
  /** Valores de los `{placeholder}` del template, sin codificar. */
  path?: Record<string, string | number> | undefined;
  body?: unknown;
  /** Que claves de `params` son parametros de consulta y no opciones de request. */
  queryKeys?: readonly string[] | undefined;
  params?: (Record<string, unknown> & RequestOptions) | undefined;
}

export type Call = <R>(operationId: string, args: CallArgs) => Promise<R>;

/** Itera los elementos de una coleccion siguiendo el cursor hasta agotarla. */
export type Paginate = <I>(operationId: string, args: Omit<CallArgs, "body">) => AsyncGenerator<I, void, undefined>;

/** Una respuesta cruda, para el escape hatch `client.request()`. */
export interface RawResponse<T = unknown> {
  status: number;
  headers: Headers;
  requestId: string | null;
  data: T;
}

export interface ClientOptions {
  /** Token `tc_live_…`. Sin el, el cliente lee `TRUO_TOKEN` del entorno. */
  token?: string;
  /** Default: el `servers[0].url` del spec (`https://api.truo.cloud`). */
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Headers agregados a toda request. */
  headers?: Record<string, string>;
  /** Reemplazo de `fetch` (tests, proxies, instrumentacion). */
  fetch?: typeof globalThis.fetch;
  /** Se sufija al `User-Agent`. Poner el nombre de tu app ayuda cuando pedis soporte. */
  userAgent?: string;
  /**
   * Se llama cuando la API marca una operacion como deprecada. Por defecto imprime un
   * aviso por stderr, **una sola vez por operacion**: si tu integracion usa algo que va a
   * desaparecer, te enteras corriendo tu propio codigo y no leyendo el changelog.
   */
  onDeprecation?: (info: DeprecationNotice) => void;
}

export interface DeprecationNotice {
  operationId: string;
  /** Fecha del anuncio (header `Deprecation`). */
  deprecation: string | null;
  /** Fecha de corte (header `Sunset`). A partir de ahi la operacion deja de existir. */
  sunset: string | null;
  /** Enlace al changelog con la ruta de migracion (header `Link; rel="deprecation"`). */
  link: string | null;
}
