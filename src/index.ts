/**
 * @fileoverview Root Node entrypoint for `pressedslip`.
 * @packageDocumentation
 *
 * Root Node entrypoint. Re-exports block definitions, registry helpers,
 * composition orchestration, Node rendering, theme/font helpers, logger
 * utilities, and public types.
 */
// Functions

export { keyValueBlock } from "./blocks/key-value.js";
export { kpiBlock } from "./blocks/kpi.js";
export { listBlock } from "./blocks/list.js";
// Builtin block definitions
export { qaPairBlock } from "./blocks/qa-pair.js";
export { quotationBlock } from "./blocks/quotation.js";
export { textCellBlock } from "./blocks/text-cell.js";
export type { WordSearchData } from "./blocks/word-search.js";
export { wordSearchBlock } from "./blocks/word-search.js";
export { composeJsoncWithHints } from "./compose-jsonc.js";
export { defineBlock } from "./define-block.js";
export { loadFontFromBuffer, loadFontFromUrl } from "./fonts.js";
export { createConsoleLogger } from "./logger.js";

// Constants
export { PAPER } from "./paper.js";
export { createRegistry } from "./registry.js";
export { render } from "./render.js";

import { keyValueBlock } from "./blocks/key-value.js";
import { kpiBlock } from "./blocks/kpi.js";
import { listBlock } from "./blocks/list.js";
import { qaPairBlock } from "./blocks/qa-pair.js";
import { quotationBlock } from "./blocks/quotation.js";
import { textCellBlock } from "./blocks/text-cell.js";
import { wordSearchBlock } from "./blocks/word-search.js";
import type { AnyBlockDefinition } from "./types.js";

/**
 * Frozen array of all built-in block definitions shipped with the package.
 *
 * Pass directly to `createRegistry` to obtain a registry with every default
 * block type registered. The order is stable and matches the order of the
 * individual block exports above (`keyValueBlock`, `kpiBlock`, `listBlock`,
 * `qaPairBlock`, `quotationBlock`, `textCellBlock`, `wordSearchBlock`).
 *
 * For browser bundles, import the structurally-identical mirror from
 * `pressedslip/browser` — that subpath re-declares `builtinBlocks` locally so
 * the Node-only `@resvg/resvg-js` is not transitively pulled in.
 *
 * @example
 * ```ts
 * import { builtinBlocks, createRegistry } from "pressedslip";
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

export { createMemoryCache } from "./orchestrator/cache.js";
// Orchestrator + browser-safe provider primitives. Node-only provider/cache
// factories are intentionally NOT re-exported at top level; import them from
// `/providers`. Browser render consumers must use `pressedslip/browser` because
// the root `render` export is backed by the Node resvg-js addon.
export { compose } from "./orchestrator/compose.js";
export { computeBriefingStatus } from "./orchestrator/compute-status.js";
export { defineProvider } from "./providers/define-provider.js";
export { createFixturePoolProvider } from "./providers/fixture-pool.js";
export { createProviderRegistry } from "./providers/registry.js";
export { createStaticTextProvider } from "./providers/static-text.js";
export type {
  FontCache,
  FontRole,
  FontUrlSpec,
  HeaderTheme,
  LoadThemeFontsOptions,
  PreparedTheme,
  ShellTheme,
  TextStyle,
  TextStyles,
  ThemeInput,
  ThemeTemplate,
} from "./themes/index.js";
// Theme API (browser-safe exports only)
// NOTE: nodeFontCache is Node-only; import it from `pressedslip/providers`.
export {
  applyHeaderDefaults,
  applyShellDefaults,
  applyTextStyle,
  defineTheme,
  HEADER_DEFAULTS,
  loadThemeFonts,
  memoryFontCache,
  SHELL_DEFAULTS,
  TEXT_STYLES_DEFAULTS,
  themes,
  validateTheme,
} from "./themes/index.js";
// Types
export type {
  AnyBlockDefinition,
  Block,
  BlockDefinition,
  BlockDefinitionSpec,
  BlockShellOptions,
  BriefingStatus,
  Cache,
  ComposeContext,
  ComposeOptions,
  Composition,
  CompositionInput,
  FailedBlock,
  JsoncCompositionInput,
  LoadedFont,
  Logger,
  PaperPreset,
  ProviderContext,
  ProviderDefinition,
  ProviderOutcome,
  ProviderResult,
  ReadOnlyCache,
  Registry,
  RenderContext,
  Rendering,
  RenderOptions,
  SerializableError,
  Slot,
  Subject,
  TimingInfo,
  WidthSpec,
} from "./types.js";
