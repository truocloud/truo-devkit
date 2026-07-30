/**
 * JSON-RPC 2.0 over stdio, newline-delimited — the MCP stdio transport.
 *
 * Hand-rolled on purpose: the framing is "one JSON message per line" and the repo rule
 * is zero runtime dependencies. stdout carries ONLY protocol messages; anything human
 * (logs, warnings) goes to stderr, because a stray `console.log` corrupts the stream
 * and the client just sees a dead server.
 */

export interface RpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: unknown;
}

export const RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const;

export class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

export type MethodHandler = (params: unknown) => unknown | Promise<unknown>;

export interface RpcServerOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

/**
 * Reads requests line by line, dispatches, writes responses. Notifications (no `id`)
 * get no response, per spec. Requests are handled sequentially: MCP clients pipeline
 * little, and sequential handling means tool calls cannot interleave their side
 * effects — which matters when one of them is `vps power stop`.
 */
export async function serveRpc(handlers: Record<string, MethodHandler>, options: RpcServerOptions = {}): Promise<void> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;

  const write = (msg: unknown): void => {
    output.write(JSON.stringify(msg) + "\n");
  };

  let buffer = "";
  let draining = Promise.resolve();

  const handleLine = async (line: string): Promise<void> => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let req: RpcRequest;
    try {
      req = JSON.parse(trimmed) as RpcRequest;
    } catch {
      write({ jsonrpc: "2.0", id: null, error: { code: RPC.PARSE_ERROR, message: "Parse error" } });
      return;
    }

    const isNotification = req.id === undefined;
    const handler = handlers[req.method];

    if (!handler) {
      if (!isNotification) {
        write({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: RPC.METHOD_NOT_FOUND, message: `Method not found: ${req.method}` },
        });
      }
      return;
    }

    try {
      const result = await handler(req.params);
      if (!isNotification) write({ jsonrpc: "2.0", id: req.id, result: result ?? {} });
    } catch (err) {
      if (isNotification) return;
      if (err instanceof RpcError) {
        write({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: err.code, message: err.message, ...(err.data !== undefined ? { data: err.data } : {}) },
        });
      } else {
        write({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: RPC.INTERNAL, message: err instanceof Error ? err.message : String(err) },
        });
      }
    }
  };

  await new Promise<void>((resolve) => {
    input.on("data", (chunk: Buffer | string) => {
      buffer += chunk.toString();
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        // Chain, so lines are processed in order even though handlers are async.
        draining = draining.then(() => handleLine(line));
      }
    });
    input.on("end", () => {
      draining.then(() => resolve());
    });
    input.on("error", () => {
      draining.then(() => resolve());
    });
  });
}
