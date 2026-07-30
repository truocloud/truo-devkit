/**
 * `@truocloud/sdk` — TypeScript client for the TruoCloud public API.
 *
 * **Zero runtime dependencies.** Everything it uses (fetch, AbortSignal, crypto) is
 * standard in Node 20+, Bun, Deno and the browser. An SDK that drags dependencies along
 * drags them into the client's application, and none were needed here.
 *
 * ```ts
 * import { TruoClient } from "@truocloud/sdk";
 *
 * const truo = new TruoClient();                       // reads TRUO_TOKEN from the environment
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

/** All contract types: `T.Vps`, `T.Operation`, `T.ServiceList`… */
export type * as T from "./generated/types.ts";
