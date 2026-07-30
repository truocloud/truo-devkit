import { createResources } from "./generated/resources.ts";
import { getOperation, OPERATIONS, OPERATION_LIST, type OperationId, type OperationMeta } from "./generated/operations.ts";
import { Transport } from "./http.ts";
import { OperationFailedError, OperationTimeoutError, TruoError } from "./errors.ts";
import type { CallArgs, ClientOptions, RawResponse, RequestOptions } from "./types.ts";
import type { Operation } from "./generated/types.ts";

export interface WaitOptions extends RequestOptions {
  /** How long to wait before giving up. Default 15 min, same as the CLI. */
  timeoutMs?: number;
  /** Initial polling interval; grows up to `maxIntervalMs`. Default 1 s. */
  intervalMs?: number;
  /** Interval ceiling. Default 5 s. */
  maxIntervalMs?: number;
  /** Called on every poll. Useful for drawing a progress bar. */
  onProgress?: (op: Operation) => void;
}

/**
 * Client for `api.truo.cloud/v1`.
 *
 * ```ts
 * const truo = new TruoClient({ token: process.env.TRUO_TOKEN });
 *
 * for await (const svc of truo.services.listAll({ family: "vps" })) console.log(svc.id);
 *
 * const op = await truo.vps.power("svc_10432", { action: "stop" });
 * await truo.operations.wait(op.id);
 * ```
 */
export class TruoClient {
  private readonly transport: Transport;
  private readonly resources: ReturnType<typeof createResources>;

  // ── Resources (generated from the OpenAPI spec) ──────────────────────────
  readonly account: ReturnType<typeof createResources>["account"];
  readonly apiKeys: ReturnType<typeof createResources>["apiKeys"];
  readonly auditLogs: ReturnType<typeof createResources>["auditLogs"];
  readonly caas: ReturnType<typeof createResources>["caas"];
  readonly dbaas: ReturnType<typeof createResources>["dbaas"];
  readonly dns: ReturnType<typeof createResources>["dns"];
  readonly lb: ReturnType<typeof createResources>["lb"];
  readonly mailgateway: ReturnType<typeof createResources>["mailgateway"];
  readonly meta: ReturnType<typeof createResources>["meta"];
  readonly objectstorage: ReturnType<typeof createResources>["objectstorage"];
  readonly services: ReturnType<typeof createResources>["services"];
  readonly vps: ReturnType<typeof createResources>["vps"];

  /**
   * `operations` is the only resource the client extends: on top of what is generated
   * (`get`, `list`) it adds `wait()`, which cannot come from the spec because it is not an
   * endpoint but a polling loop over one.
   */
  readonly operations: ReturnType<typeof createResources>["operations"] & {
    wait: (id: string, options?: WaitOptions) => Promise<Operation>;
  };

  constructor(options: ClientOptions = {}) {
    this.transport = new Transport(options);
    this.resources = createResources(
      (id, args) => this.transport.call(id, args as CallArgs),
      (id, args) => this.transport.paginate(id, args as CallArgs),
    );

    this.account = this.resources.account;
    this.apiKeys = this.resources.apiKeys;
    this.auditLogs = this.resources.auditLogs;
    this.caas = this.resources.caas;
    this.dbaas = this.resources.dbaas;
    this.dns = this.resources.dns;
    this.lb = this.resources.lb;
    this.mailgateway = this.resources.mailgateway;
    this.meta = this.resources.meta;
    this.objectstorage = this.resources.objectstorage;
    this.services = this.resources.services;
    this.vps = this.resources.vps;

    this.operations = {
      ...this.resources.operations,
      wait: (id, opts) => this.waitForOperation(id, opts),
    };
  }

  /** Effective base URL. Useful for error messages and for tests. */
  get baseUrl(): string {
    return this.transport.baseUrl;
  }

  /**
   * Raw call by `operationId`, with status and headers.
   *
   * This is the escape hatch for anything the typed tree does not cover yet — and for
   * reading headers like `RateLimit-Remaining`, which the regular methods discard because
   * they return the body directly.
   */
  request<R = unknown>(operationId: OperationId | (string & {}), args: CallArgs = {}): Promise<RawResponse<R>> {
    return this.transport.request<R>(operationId, args);
  }

  /** Metadata for one operation of the contract (scope, danger, whether it is async). */
  static operation(id: string): OperationMeta | undefined {
    return getOperation(id);
  }

  /** All operations of the contract. Consumed by the CLI and the MCP server. */
  static get operations(): OperationMeta[] {
    return OPERATION_LIST;
  }

  /**
   * Waits for an asynchronous operation to finish.
   *
   * The interval starts at 1 s and grows up to 5 s: short operations (a `stop`) come back
   * fast, and long ones (a `reinstall`) do not justify one poll per second for ten
   * minutes. A `stale: true` **does not stop the wait**: it means the backend did not
   * answer and this is the last known state, not that the operation was lost.
   */
  private async waitForOperation(id: string, options: WaitOptions = {}): Promise<Operation> {
    const timeoutMs = options.timeoutMs ?? 15 * 60_000;
    const maxIntervalMs = options.maxIntervalMs ?? 5_000;
    let interval = options.intervalMs ?? 1_000;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const op = await this.resources.operations.get(id, {
        ...(options.signal ? { signal: options.signal } : {}),
      });
      options.onProgress?.(op);

      if (op.status === "succeeded") return op;
      if (op.status === "failed") {
        throw new OperationFailedError(
          `Operation ${id} (${op.type}) failed${describeError(op.error)}.`,
          id,
          { code: "operation_failed", raw: op.error },
        );
      }

      if (Date.now() + interval > deadline) {
        throw new OperationTimeoutError(
          `Operation ${id} is still "${op.status}" after ${Math.round(timeoutMs / 1000)} s. ` +
            `It was not cancelled: resume it with operations.wait("${id}").`,
          id,
        );
      }

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, interval);
        options.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(t);
            reject(options.signal!.reason);
          },
          { once: true },
        );
      });
      interval = Math.min(maxIntervalMs, Math.round(interval * 1.5));
    }
  }
}

function describeError(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return `: ${err}`;
  const message = (err as { message?: string }).message;
  return message ? `: ${message}` : `: ${JSON.stringify(err).slice(0, 200)}`;
}

export { OPERATIONS, OPERATION_LIST, getOperation, TruoError };
export type { OperationId, OperationMeta };
