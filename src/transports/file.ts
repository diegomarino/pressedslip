/**
 * @fileoverview File transport: writes payload bytes to a filesystem path.
 * Path confinement is the caller's responsibility (capability, not server).
 */

import { writeFile } from "node:fs/promises";
import type { Transport, TransportPayload } from "./types.js";

/**
 * Configuration for the file system transport.
 */
export interface FileTransportConfig {
  /** Filesystem path to write to. Caller is responsible for path safety. */
  readonly path: string;
  /** File mode (defaults to 0o644). */
  readonly mode?: number;
}

/**
 * Create a Transport that writes `payload.bytes` to a filesystem path.
 *
 * @param config - Target path and optional file mode (defaults to `0o644`).
 * @returns A `Transport` whose `send()` writes the payload bytes atomically via `fs.writeFile`.
 *
 * @throws {Error} with Node-native `error.code` (e.g., `EACCES`, `ENOSPC`,
 *   `ENOENT`, `EISDIR`). Original errors are re-thrown as-is.
 *
 * @example
 * ```ts
 * import { createFileTransport } from "pressedslip/transports";
 * const transport = createFileTransport({ path: "/tmp/out.png" });
 * await transport.send({ bytes: compositionPng });
 * ```
 */
export function createFileTransport(config: FileTransportConfig): Transport {
  const { path, mode = 0o644 } = config;
  return {
    async send(payload: TransportPayload): Promise<void> {
      await writeFile(path, payload.bytes, { mode });
    },
  };
}
