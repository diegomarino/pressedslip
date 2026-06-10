/**
 * @module pressedslip/browser
 * @fileoverview Browser-safe entrypoint for `pressedslip/browser`.
 *
 * Browser-safe entrypoint. Re-exports blocks, registry helpers, themes,
 * provider primitives, and the resvg-wasm render path without importing Node
 * native modules. Verified by `scripts/verify-browser-bundle.mjs`.
 */

import { keyValueBlock } from "../blocks/key-value.js";
import { kpiBlock } from "../blocks/kpi.js";
import { listBlock } from "../blocks/list.js";
import { qaPairBlock } from "../blocks/qa-pair.js";
import { quotationBlock } from "../blocks/quotation.js";
import { textCellBlock } from "../blocks/text-cell.js";
import { wordSearchBlock } from "../blocks/word-search.js";
import type { AnyBlockDefinition } from "../types.js";

export { keyValueBlock } from "../blocks/key-value.js";
export { kpiBlock } from "../blocks/kpi.js";
export { listBlock } from "../blocks/list.js";
export { qaPairBlock } from "../blocks/qa-pair.js";
export { quotationBlock } from "../blocks/quotation.js";
export { textCellBlock } from "../blocks/text-cell.js";
export { wordSearchBlock } from "../blocks/word-search.js";
// Block definitions + registry factory + JSONC helper — re-exported DIRECTLY
// from their modules (NOT through src/index.ts) to avoid transitively pulling
// @resvg/resvg-js (Node native addon) into the browser bundle. Verified by
// scripts/verify-browser-bundle.mjs.
// JSONC composition helper (browser-safe: pure string ops, no Node deps).
export { composeJsoncWithHints } from "../compose-jsonc.js";
/**
 * Frozen array of all built-in block definitions — browser-safe mirror of the main `builtinBlocks`.
 *
 * Re-declared here (not re-exported from `src/index.ts`) to avoid transitively
 * pulling `@resvg/resvg-js` (Node native addon) into the browser bundle.
 * Verified by `scripts/verify-browser-bundle.mjs`.
 *
 * @example
 * ```ts
 * import { builtinBlocks, createRegistry } from "pressedslip/browser";
 *
 * const registry = createRegistry(builtinBlocks);
 * ```
 */
export const builtinBlocks: readonly AnyBlockDefinition[] = Object.freeze([
  keyValueBlock,
  kpiBlock,
  listBlock,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
  wordSearchBlock,
]);
export { defineBlock } from "../define-block.js";
export { createMemoryCache } from "../orchestrator/cache.js";
export { compose } from "../orchestrator/compose.js";
export { computeBriefingStatus } from "../orchestrator/compute-status.js";
export { defineProvider } from "../providers/define-provider.js";
export { createFixturePoolProvider } from "../providers/fixture-pool.js";
export { createProviderRegistry } from "../providers/registry.js";
export { createStaticTextProvider } from "../providers/static-text.js";
export { createRegistry } from "../registry.js";
export { SHELL_DEFAULTS } from "../themes/apply-defaults.js";
export { applyTextStyle } from "../themes/apply-text-style.js";
// Builtin themes (browser-safe: pure data, CDN font URLs, no Node deps).
export { themes } from "../themes/builtins/index.js";
export { memoryFontCache } from "../themes/cache.js";
export { type LoadThemeFontsOptions, loadThemeFonts } from "../themes/load.js";
export type {
  FontCache,
  FontRole,
  FontUrlSpec,
  HeaderTheme,
  PreparedTheme,
  ShellTheme,
  ThemeInput,
  ThemeTemplate,
} from "../themes/types.js";
export type {
  AnyBlockDefinition,
  BlockDefinition,
  BriefingStatus,
  Cache,
  ComposeContext,
  ComposeOptions,
  Composition,
  CompositionInput,
  FailedBlock,
  ProviderContext,
  ProviderDefinition,
  ProviderOutcome,
  ProviderResult,
  ReadOnlyCache,
  RenderContext,
  Rendering,
  SerializableError,
  Slot,
  TimingInfo,
} from "../types.js";
export type { BrowserRenderOptions } from "./render.js";
// Browser render path (resvg-wasm).
export { render } from "./render.js";
