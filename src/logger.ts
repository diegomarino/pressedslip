/**
 * @fileoverview Logger interface, noop default, and console-routing shim used across the render pipeline.
 */
import type { Logger } from "./types.js";

const NOOP = (): void => {
  // no-op
};

/**
 * Silent Logger implementation. All four methods are no-ops.
 * Used as the default when no logger is supplied to `render()`.
 */
export const noopLogger: Logger = {
  debug: NOOP,
  info: NOOP,
  warn: NOOP,
  error: NOOP,
};

/**
 * Create a Logger that routes all four levels to the corresponding `console.*` methods.
 *
 * Suitable for CLI tools and test harnesses; not recommended for production
 * servers where structured logging is preferred.
 *
 * @returns A `Logger` that forwards debug/info/warn/error to `console.*`.
 * @example
 * ```ts
 * import { createConsoleLogger, render, createRegistry, builtinBlocks } from "pressedslip";
 *
 * const logger = createConsoleLogger();
 * const registry = createRegistry(builtinBlocks);
 * // logger will print pipeline diagnostics to stdout/stderr
 * ```
 */
export function createConsoleLogger(): Logger {
  return {
    debug: (msg, fields) => console.debug(msg, fields),
    info: (msg, fields) => console.info(msg, fields),
    warn: (msg, fields) => console.warn(msg, fields),
    error: (msg, fields) => console.error(msg, fields),
  };
}
