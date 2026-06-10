/**
 * @module pressedslip/providers
 * @fileoverview Provider entrypoint for `pressedslip/providers`.
 *
 * Provider entrypoint. Contains all provider primitives plus Node-only
 * factories such as OpenMeteo, file cache, and node font cache.
 */

export { createMemoryCache } from "../orchestrator/cache.js";
export { createFileCache } from "../orchestrator/file-cache.js";
// Node-only font disk cache (uses node:fs/promises + node:crypto).
export { nodeFontCache } from "../themes/node-font-cache.js";
export type {
  Cache,
  ProviderContext,
  ProviderDefinition,
  ProviderOutcome,
  ProviderResult,
  ReadOnlyCache,
  SerializableError,
} from "../types.js";
export { defineProvider } from "./define-provider.js";
export { createFixturePoolProvider } from "./fixture-pool.js";
export { createOpenMeteoProvider } from "./open-meteo.js";
export { createProviderRegistry } from "./registry.js";
export { createStaticTextProvider } from "./static-text.js";
