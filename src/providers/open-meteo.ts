/**
 * @fileoverview open-meteo.com weather provider (Node-only). Reads lat/lon from ctx.userCtx.location at fetch time. Returns the raw open-meteo response payload.
 */
import type { ProviderDefinition } from "../types.js";

class MissingLocationError extends Error {
  constructor(detail: string) {
    super(`open-meteo: ctx.userCtx.location is missing or malformed (${detail})`);
    this.name = "MissingLocationError";
  }
}

/**
 * Raw open-meteo API response payload. Typed as `unknown` so consumers can
 * narrow to their specific field subset without coupling to the full API shape.
 */
export type OpenMeteoData = unknown; // raw API response; consumers narrow per their needs

/**
 * Create a `ProviderDefinition` that fetches current weather from open-meteo.com (Node-only).
 *
 * Relies on global `fetch` and `URL` available in Node 18+.
 * Reads `ctx.userCtx.location` at fetch time; expects `{ lat: number; lon: number }`.
 * Throws `MissingLocationError` (caught by the orchestrator, mapped to `{ok:'error'}`)
 * when location is absent or malformed. Do not import from the `/browser` subpath.
 *
 * @param opts - Configuration object.
 * @param opts.key - Provider key used for cache keying and `providerOutcomes` map.
 * @param opts.units - `"metric"` (default) or `"imperial"` — sets the `temperature_unit` param.
 * @param opts.endpoint - Override base URL for testing; defaults to `https://api.open-meteo.com/v1/forecast`.
 * @returns A `ProviderDefinition<OpenMeteoData>` with `scope:'shared'` and `freshness:'per-hour'`.
 *
 * @example
 * ```ts
 * import { createOpenMeteoProvider } from "pressedslip/providers";
 *
 * const weather = createOpenMeteoProvider({ key: "weather", units: "metric" });
 * // Used inside a provider registry; ctx.userCtx must include { location: { lat, lon } }.
 * ```
 */
export function createOpenMeteoProvider(opts: {
  key: string;
  units?: "metric" | "imperial";
  endpoint?: string;
}): ProviderDefinition<OpenMeteoData> {
  const units = opts.units ?? "metric";
  const endpoint = opts.endpoint ?? "https://api.open-meteo.com/v1/forecast";

  return {
    key: opts.key,
    scope: "shared",
    freshness: "per-hour",
    async fetch(ctx) {
      const loc = (ctx.userCtx as { location?: unknown }).location;
      if (
        typeof loc !== "object" ||
        loc === null ||
        typeof (loc as { lat?: unknown }).lat !== "number" ||
        typeof (loc as { lon?: unknown }).lon !== "number"
      ) {
        throw new MissingLocationError(JSON.stringify(loc));
      }
      const { lat, lon } = loc as { lat: number; lon: number };
      const url = new URL(endpoint);
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("longitude", String(lon));
      url.searchParams.set("current", "temperature_2m");
      url.searchParams.set("temperature_unit", units === "metric" ? "celsius" : "fahrenheit");
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`open-meteo: HTTP ${res.status}`);
      }
      const value = await res.json();
      return { ok: "data", value };
    },
  };
}
