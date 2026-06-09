/**
 * @fileoverview Static-value reference provider: always returns the configured value. Browser-safe. The trivial reference provider used in docs and tests.
 */
import type { ProviderDefinition } from "../types.js";

/**
 * Creates a static text provider that always returns a configured value.
 *
 * This is a trivial reference provider suitable for documentation, examples,
 * and testing. It ignores all context and returns the same value every time.
 *
 * @template T - The type of the value (defaults to `string`).
 * @param opts - Configuration object.
 * @param opts.key - Provider key.
 * @param opts.value - The static value to always return.
 * @returns A `ProviderDefinition` that always returns the configured value.
 *
 * @example
 * ```ts
 * const p = createStaticTextProvider({ key: 'header', value: 'Daily Briefing' });
 * const result = await p.fetch(ctx, null);
 * // { ok: 'data', value: 'Daily Briefing' }
 * ```
 */
export function createStaticTextProvider<T = string>(opts: {
  key: string;
  value: T;
}): ProviderDefinition<T> {
  return {
    key: opts.key,
    scope: "shared",
    freshness: "never",
    async fetch() {
      return { ok: "data", value: opts.value };
    },
  };
}
