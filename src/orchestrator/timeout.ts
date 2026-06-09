/**
 * @fileoverview Timeout wrapper for provider fetch calls. Raises TimeoutError when a promise exceeds its budget. See spec §3.1 and §9.1.
 */

/**
 * Error raised when the orchestrator's `withTimeout` wrapper exceeds its
 * budget. Surfaces inside `ProviderResult` as `{ok:'error', reason:{name:'TimeoutError', ...}}`
 * — there is no separate variant for timeouts (spec §3.1).
 */
export class TimeoutError extends Error {
  constructor(operation: string, ms: number) {
    super(`Operation '${operation}' exceeded ${ms}ms timeout`);
    this.name = "TimeoutError";
  }
}

/**
 * Race a promise against a timeout. If the promise settles first (resolve or
 * reject), its value/reason propagates. If the timeout fires first, the
 * returned promise rejects with TimeoutError.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(operation, ms)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}
