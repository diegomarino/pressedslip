/**
 * @fileoverview Public types for the /transports subpath. The `Transport`
 * interface is the contract every reference transport implements (fire-and-forget
 * throws + tagged `error.code`). The `TransportPayload` shape is a single-arg
 * object — additive field evolution does not break consumers.
 */

/**
 * Bytes-plus-metadata payload accepted by every transport's `send()`.
 * The `mimeType` default (`"image/png"`) is applied at each transport's
 * `send()` entry-point before any transport-specific validation.
 */
export interface TransportPayload {
  /** Raw image bytes to transmit; typically 1-bit PNG output from render(). */
  readonly bytes: Uint8Array;
  /** MIME type of the payload; defaults to "image/png" when omitted. */
  readonly mimeType?: string;
}

/**
 * Fire-and-forget transport contract. Throws on failure with a tagged
 * `error.code: string` field (Node native codes preserved where applicable;
 * synthesized codes documented per transport).
 *
 * Programmer-errors (`TypeError`, `ReferenceError`, non-Error throws) MUST
 * NOT be caught — per ADR-0014 alignment.
 */
export interface Transport {
  /** Transmit payload bytes to the transport's endpoint. Throws on failure with a tagged error.code. */
  send(payload: TransportPayload): Promise<void>;
}

/**
 * Construct an `Error` with a stable `code` tag for retriability classification.
 *
 * Node-native errors are NOT wrapped — callers re-throw them as-is. Public so
 * consumers can inspect `err.code` to determine whether to retry.
 *
 * @param code - Stable machine-readable error code (e.g. `"ECONNREFUSED"`).
 * @param message - Human-readable description of the failure.
 * @param cause - Optional underlying cause; stored as `Error.cause`.
 * @returns A new `Error` instance with a `.code` string property attached.
 *
 * @example
 * ```ts
 * import { transportError } from "pressedslip/transports";
 * throw transportError("UNSUPPORTED_MIME", `Only image/png is accepted (got ${mimeType})`);
 * ```
 */
export function transportError(code: string, message: string, cause?: unknown): Error {
  const err = cause === undefined ? new Error(message) : new Error(message, { cause });
  (err as Error & { code: string }).code = code;
  return err;
}
