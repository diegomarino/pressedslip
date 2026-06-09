/**
 * @fileoverview Identity helper for declaring providers with type inference.
 */
import type { ProviderDefinition } from "../types.js";

/**
 * Identity helper that infers `T` from the literal `fetch` return type while fully typing the spec.
 *
 * @param spec - Full provider definition including key, scope, freshness, and fetch implementation.
 * @returns The same `ProviderDefinition<T>` object, unchanged, with inferred generic type.
 *
 * @example
 * ```ts
 * import { defineProvider } from "pressedslip/providers";
 *
 * const myProvider = defineProvider({
 *   key: "headline",
 *   scope: "shared",
 *   freshness: "per-day",
 *   async fetch() {
 *     return { ok: "data", value: "Today's top story" };
 *   },
 * });
 * ```
 */
export function defineProvider<T>(spec: ProviderDefinition<T>): ProviderDefinition<T> {
  return spec;
}
