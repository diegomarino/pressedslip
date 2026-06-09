/**
 * @fileoverview Fixture-pool reference provider: picks one element from a configured pool deterministically using ctx.random(). Browser-safe.
 */
import type { ProviderDefinition } from "../types.js";

/**
 * Creates a reference provider that selects one element deterministically from a
 * configured pool using the phase-scoped PRNG in ctx.random(). Browser-safe; no Node APIs.
 *
 * @param opts - Configuration object.
 * @param opts.key - Provider identifier (e.g., `"quotes"`, `"tips"`).
 * @param opts.pool - Array of values to pick from; empty pool yields `{ ok: "suppressed" }`.
 * @param opts.scope - Scope level: `"shared"` (default) or `"personal"`. Affects cache invalidation.
 * @param opts.freshness - Cache policy: `"per-day"` (default), `"per-hour"`, `"never"`, or `"always-fetch"`.
 * @returns A `ProviderDefinition<T>` with deterministic fetch and configured scope/freshness.
 *
 * @example
 * ```ts
 * import { createFixturePoolProvider } from "pressedslip/providers";
 *
 * const provider = createFixturePoolProvider({
 *   key: "daily-quote",
 *   pool: ["Quote A", "Quote B", "Quote C"],
 *   scope: "shared",
 *   freshness: "per-day",
 * });
 * const result = await provider.fetch(ctx, null);
 * // result.ok === "data"       → result.value is one element from pool (deterministic per date/seed)
 * // result.ok === "suppressed" → pool was empty
 * ```
 */
export function createFixturePoolProvider<T>(opts: {
  key: string;
  pool: readonly T[];
  scope?: "shared" | "personal";
  freshness?: ProviderDefinition<T>["freshness"];
}): ProviderDefinition<T> {
  const scope = opts.scope ?? "shared";
  const freshness = opts.freshness ?? "per-day";
  return {
    key: opts.key,
    scope,
    freshness,
    async fetch(ctx) {
      if (opts.pool.length === 0) return { ok: "suppressed" };
      const idx = Math.floor(ctx.random() * opts.pool.length);
      // biome-ignore lint/style/noNonNullAssertion: idx is within bounds from modulo
      return { ok: "data", value: opts.pool[idx]! };
    },
  };
}
