/**
 * @fileoverview JSON-serializable error projection plus programmer-error classification used by the orchestrator's try/catch wrapper (spec §3.1, ADR-0014).
 */

/**
 * JSON-serializable Error shape used inside Composition values
 * (FailedBlock.reason, ProviderOutcome.reason). Composition is JSON-
 * serializable by contract for M14 payloadJson persistence, so class
 * instances of Error never appear on Composition — they are projected
 * via toSerializableError before being stored.
 */
export interface SerializableError {
  /** Error class name (e.g. "Error", "TypeError"). */
  readonly name: string;
  /** Human-readable error description. */
  readonly message: string;
  /** Optional stack trace string; present when the original Error had one. */
  readonly stack?: string;
}

/**
 * Project an Error instance to its JSON-serializable shape. Composition values
 * are persisted as `payloadJson` (M14) and must survive JSON.stringify.
 */
export function toSerializableError(err: Error): SerializableError {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

/**
 * Classify a thrown value as a programmer error that should NOT be absorbed
 * by the orchestrator's provider-fetch try/catch wrapper.
 *
 * Per ADR-0014 and spec §3.1, the following always re-raise:
 * - non-Error throws (string, undefined, null, plain object): always bugs
 * - TypeError / ReferenceError: almost never legitimate operational errors
 *
 * Ordinary Error and custom Error subclasses ARE absorbed and surface as
 * `{ok:'error'}` outcomes.
 */
export function isProgrammerError(thrown: unknown): boolean {
  if (!(thrown instanceof Error)) return true;
  if (thrown instanceof TypeError) return true;
  if (thrown instanceof ReferenceError) return true;
  return false;
}
