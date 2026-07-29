import { createResources } from "./generated/resources.ts";
import { getOperation, OPERATIONS, OPERATION_LIST, type OperationId, type OperationMeta } from "./generated/operations.ts";
import { Transport } from "./http.ts";
import { OperationFailedError, OperationTimeoutError, TruoError } from "./errors.ts";
import type { CallArgs, ClientOptions, RawResponse, RequestOptions } from "./types.ts";
import type { Operation } from "./generated/types.ts";

export interface WaitOptions extends RequestOptions {
  /** Cuanto esperar antes de rendirse. Default 15 min, igual que el CLI. */
  timeoutMs?: number;
  /** Intervalo inicial de polling; crece hasta `maxIntervalMs`. Default 1 s. */
  intervalMs?: number;
  /** Techo del intervalo. Default 5 s. */
  maxIntervalMs?: number;
  /** Se llama en cada consulta. Sirve para pintar una barra de progreso. */
  onProgress?: (op: Operation) => void;
}

/**
 * Cliente de `api.truo.cloud/v1`.
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

  // ── Recursos (generados del OpenAPI) ─────────────────────────────────────
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
   * `operations` es el unico recurso que el cliente extiende: a lo generado (`get`,
   * `list`) le suma `wait()`, que no puede salir del spec porque no es un endpoint sino
   * un bucle de polling sobre uno.
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

  /** Base URL efectiva. Util para mensajes de error y para tests. */
  get baseUrl(): string {
    return this.transport.baseUrl;
  }

  /**
   * Llamada cruda por `operationId`, con status y headers.
   *
   * Es el escape hatch para lo que el arbol tipado todavia no cubre — y para leer headers
   * como `RateLimit-Remaining`, que los metodos normales descartan porque devuelven el
   * cuerpo directo.
   */
  request<R = unknown>(operationId: OperationId | (string & {}), args: CallArgs = {}): Promise<RawResponse<R>> {
    return this.transport.request<R>(operationId, args);
  }

  /** Metadatos de una operacion del contrato (scope, peligro, si es asincrona). */
  static operation(id: string): OperationMeta | undefined {
    return getOperation(id);
  }

  /** Todas las operaciones del contrato. Lo consumen el CLI y el servidor MCP. */
  static get operations(): OperationMeta[] {
    return OPERATION_LIST;
  }

  /**
   * Espera a que una operacion asincrona termine.
   *
   * El intervalo arranca en 1 s y crece hasta 5 s: las operaciones cortas (un `stop`)
   * responden rapido y las largas (un `reinstall`) no justifican una consulta por segundo
   * durante diez minutos. Un `stale: true` **no corta la espera**: significa que el
   * backend no contesto y esto es el ultimo estado conocido, no que la operacion se haya
   * perdido.
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
          `La operacion ${id} (${op.type}) fallo${describeError(op.error)}.`,
          id,
          { code: "operation_failed", raw: op.error },
        );
      }

      if (Date.now() + interval > deadline) {
        throw new OperationTimeoutError(
          `La operacion ${id} sigue en "${op.status}" despues de ${Math.round(timeoutMs / 1000)} s. ` +
            `No se cancelo: retomala con operations.wait("${id}").`,
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
