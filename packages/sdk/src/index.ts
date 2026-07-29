/**
 * `@truocloud/sdk` — cliente TypeScript de la API publica de TruoCloud.
 *
 * **Cero dependencias en runtime.** Todo lo que usa (fetch, AbortSignal, crypto) es
 * estandar en Node 20+, Bun, Deno y el navegador. Un SDK que arrastra dependencias las
 * arrastra a la aplicacion del cliente, y aca no hacia falta ninguna.
 *
 * ```ts
 * import { TruoClient } from "@truocloud/sdk";
 *
 * const truo = new TruoClient();                       // lee TRUO_TOKEN del entorno
 * const vps = await truo.vps.get("svc_10432");
 * ```
 */
export { TruoClient } from "./client.ts";
export type { WaitOptions } from "./client.ts";

export {
  TruoError,
  AuthenticationError,
  AuthorizationError,
  InvalidRequestError,
  RateLimitError,
  ApiError,
  ApiConnectionError,
  OperationFailedError,
  OperationTimeoutError,
  errorFromResponse,
} from "./errors.ts";
export type { ApiErrorBody, ErrorOpts } from "./errors.ts";

export { Transport } from "./http.ts";

export { OPERATIONS, OPERATION_LIST, getOperation } from "./generated/operations.ts";
export type { OperationId, OperationMeta } from "./generated/operations.ts";

export type {
  ClientOptions,
  RequestOptions,
  CallArgs,
  RawResponse,
  DeprecationNotice,
  Call,
  Paginate,
} from "./types.ts";

/** Todos los tipos del contrato: `T.Vps`, `T.Operation`, `T.ServiceList`… */
export type * as T from "./generated/types.ts";
