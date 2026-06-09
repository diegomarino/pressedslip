/**
 * @fileoverview Provider registry constructor with two runtime invariants: registry-key matches provider.key, no two providers share the same key.
 */
import type { ProviderDefinition } from "../types.js";

/**
 * Construct a typed provider registry enforcing key-consistency and uniqueness invariants.
 *
 * Two runtime invariants are checked on construction:
 *   1. Every object key MUST equal the corresponding `ProviderDefinition.key`.
 *   2. No two entries may declare the same `ProviderDefinition.key`.
 * Both violations throw a programmer error. The input object is returned unchanged so the
 * inferred type preserves each entry's exact shape for `keyof Registry` consumers.
 *
 * @param providers - Record mapping provider keys to their `ProviderDefinition` objects.
 * @returns The same registry object `R`, typed to preserve per-entry shapes.
 *
 * @example
 * ```ts
 * import { createProviderRegistry, createStaticTextProvider } from "pressedslip/providers";
 *
 * const registry = createProviderRegistry({
 *   greeting: createStaticTextProvider({ key: "greeting", value: "Good morning!" }),
 * });
 * // registry.greeting is typed as ProviderDefinition<string>
 * ```
 */
export function createProviderRegistry<R extends Record<string, ProviderDefinition<unknown>>>(
  providers: R,
): R {
  const seen = new Set<string>();

  // First pass: check for duplicate provider.keys
  for (const [, provider] of Object.entries(providers)) {
    if (seen.has(provider.key)) {
      throw new Error(`createProviderRegistry: duplicate provider.key '${provider.key}'`);
    }
    seen.add(provider.key);
  }

  // Second pass: check for registry-key mismatches
  for (const [registryKey, provider] of Object.entries(providers)) {
    if (provider.key !== registryKey) {
      throw new Error(
        `createProviderRegistry: key mismatch — registered as '${registryKey}' but provider.key is '${provider.key}'`,
      );
    }
  }

  return providers;
}
