/**
 * @fileoverview Deterministic cache-key derivation from provider scope/freshness + per-compose ctx. Returns null for always-fetch providers (cache is skipped).
 */
import type { ProviderDefinition } from "../types.js";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Derive the cache key for a provider in a given compose() run.
 * Returns null when the provider has freshness:'always-fetch' (cache is
 * skipped entirely). See spec §6.2.
 *
 * @throws Never — the orchestrator pre-validates ctx.subjectId for personal-
 *   scope providers and ctx.hour for per-hour providers (spec §5.1), so this
 *   function trusts its inputs.
 */
export function deriveCacheKey(
  provider: ProviderDefinition<unknown>,
  ctx: { date: string; hour?: number; subjectId?: string },
): string | null {
  if (provider.freshness === "always-fetch") return null;
  const scopePart = provider.scope === "personal" ? ctx.subjectId : "shared";
  let freshnessPart: string;
  switch (provider.freshness) {
    case "per-day":
      freshnessPart = ctx.date;
      break;
    case "per-hour":
      // biome-ignore lint/style/noNonNullAssertion: orchestrator pre-validates ctx.hour
      freshnessPart = `${ctx.date}T${pad2(ctx.hour!)}`;
      break;
    case "never":
      freshnessPart = "static";
      break;
    default: {
      // 'always-fetch' is handled by the early return above; this branch is
      // unreachable but required for biome's exhaustive-switch rule.
      const exhaustive: never = provider.freshness;
      throw new Error(`deriveCacheKey: unhandled freshness '${exhaustive}'`);
    }
  }
  return `${provider.key}:${scopePart}:${freshnessPart}`;
}
