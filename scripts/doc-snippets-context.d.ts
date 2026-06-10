/**
 * Ambient declarations for pressedslip documentation code snippets.
 *
 * PURPOSE: Many documentation fences are honest fragments that reference
 * variables established in surrounding prose or earlier fences in the same
 * guide. Rather than repeating full boilerplate in every snippet, we declare
 * those "prose-established" variables here so TypeScript can type-check the
 * fragment without false positives.
 *
 * This file is included in every per-fence compilation via the `files` array
 * in the dynamic tsconfig. The `declare global` block makes these declarations
 * visible in all module-scoped fence files (which have `export {}` to avoid
 * being treated as global scripts).
 *
 * These declarations are NOT production code — they exist solely to anchor
 * the type-checker to the correct types for common doc patterns.
 *
 * Maintenance: when a new guide introduces a new ambient variable, add it here
 * with the real type imported from the dist declarations. Do NOT use `any` —
 * the point of this file is to get real type coverage, not to silence errors.
 */

// This import makes the file a module, enabling `declare global {}` below.
import type {
  AnyBlockDefinition as _AnyBlockDefinition,
  BlockDefinition as _BlockDefinition,
  BriefingStatus as _BriefingStatus,
  Cache as _Cache,
  Composition as _Composition,
  PreparedTheme as _PreparedTheme,
  ProviderDefinition as _ProviderDefinition,
  ReadOnlyCache as _ReadOnlyCache,
  Registry as _Registry,
  RenderContext as _RenderContext,
  Rendering as _Rendering,
  RenderOptions as _RenderOptions,
  ThemeTemplate as _ThemeTemplate,
} from "../dist/index.d.mts";

declare global {
  // ---------------------------------------------------------------------------
  // Variables commonly established in prose or earlier fences
  // ---------------------------------------------------------------------------

  /** A fully-constructed Composition (built by compose() or a hand-written literal). */
  const composition: _Composition;

  /** A prepared (font-loaded) theme, typically from loadThemeFonts(). */
  const theme: _PreparedTheme;

  /** A prepared theme (alias used in batch-render examples). */
  const prepared: _PreparedTheme;

  /** A block registry, typically from createRegistry(). */
  const registry: _Registry;

  /** PNG render output (Uint8Array + metadata) from render(). */
  const bytes: Uint8Array;

  /** The full rendering result from render(). */
  const rendering: _Rendering;

  /** Multiple compositions for batch-render examples. */
  const compositions: readonly _Composition[];

  /** A provider registry, typically from createProviderRegistry(). */
  const providers: Record<string, _ProviderDefinition<unknown>>;

  /** A custom block definition (used in troubleshooting and custom-block guides). */
  const myCustomBlock: _AnyBlockDefinition;

  /** A custom KPI block definition (used in troubleshooting guide). */
  const myKpiBlock: _AnyBlockDefinition;

  /** A named registry (used in troubleshooting guide). */
  const myRegistry: _Registry;

  /** A cache instance (used in providers and caching examples). */
  const myCache: _Cache;

  /** Render options (used in some fragments that show partial option overrides). */
  const options: _RenderOptions;

  /** A render context (used in block render function examples). */
  const ctx: _RenderContext;

  /** Generic block data (used in block render function examples). */
  const data: unknown;

  /** A named transport (used in transports guide). */
  const transport: { send: (payload: { bytes: Uint8Array; mimeType?: string }) => Promise<void> };

  /** An S3 transport (used in transports S3 example continuation fence). */
  const s3Transport: { send: (payload: { bytes: Uint8Array; mimeType?: string }) => Promise<void> };

  /** Block count for assertBlockCount examples. */
  const expectedCount: number;

  /** A wasm URL (used in browser-rendering fences that reference wasmUrl from prose). */
  const wasmUrl: string;

  /** A block registry used as `blocks` (compose option) in orchestration examples. */
  const blocks: _Registry;

  /** z — the Zod builder (for fences that use z.object() without importing). */
  const z: {
    object<T extends { [k: string]: import("zod").ZodType<unknown> }>(
      shape: T,
    ): import("zod").ZodObject<T>;
    string(): import("zod").ZodType<string>;
    number(): import("zod").ZodType<number>;
    boolean(): import("zod").ZodType<boolean>;
    enum<T extends [string, ...string[]]>(values: T): import("zod").ZodEnum<T>;
    any(): import("zod").ZodType<unknown>;
  };

  // ---------------------------------------------------------------------------
  // Custom-block-walkthrough sequential fence declarations.
  // Steps 1–4 in the walkthrough build incrementally; later fences reference
  // types and values from earlier fences. Declaring them here avoids false
  // "cannot find name" errors for the dependent fences.
  // ---------------------------------------------------------------------------
  type WeatherBlockData = {
    temperature: number;
    condition: "sunny" | "cloudy" | "rainy" | "snowy";
    icon: string;
  };
  const weatherBlockSchema: import("zod").ZodType<WeatherBlockData>;
  const renderWeather: (props: { data: WeatherBlockData }) => import("react").ReactElement;
  const weatherBlock: _BlockDefinition<WeatherBlockData>;

  // ---------------------------------------------------------------------------
  // Transport types — used in transports.md fences as interface references.
  // ---------------------------------------------------------------------------
  interface Transport {
    send(payload: TransportPayload): Promise<void>;
  }
  interface TransportPayload {
    readonly bytes: Uint8Array;
    readonly mimeType?: string;
  }

  // ---------------------------------------------------------------------------
  // Doc-local types used in walkthrough examples without being formally defined.
  // ---------------------------------------------------------------------------
  /** Placeholder data type in Advanced Render Context example. */
  type MyData = Record<string, unknown>;
  /** Placeholder block data type in block render function examples. */
  type MyBlockData = Record<string, unknown>;
  /** ReactElement — declared globally for fences that use it without importing from 'react'. */
  type ReactElement = import("react").ReactElement;
  /** RenderContext — declared globally for fences that reference it without importing. */
  type RenderContext = _RenderContext;
  /** ReadOnlyCache — declared globally for type-documentation fences that reference it. */
  type ReadOnlyCache = _ReadOnlyCache;

  // ---------------------------------------------------------------------------
  // Library functions referenced in fragments without being re-imported.
  // These are declared as ambient globals so honest doc fragments that omit
  // the import boilerplate still typecheck. Fences that DO import these names
  // shadow the ambient declaration with their local import — no conflict.
  // ---------------------------------------------------------------------------

  /** render() from pressedslip — renders a Composition to PNG. */
  function render(composition: _Composition, options: _RenderOptions): Promise<_Rendering>;

  /** createRegistry() from pressedslip. */
  function createRegistry(definitions: readonly _AnyBlockDefinition[]): _Registry;

  /** builtinBlocks from pressedslip. */
  const builtinBlocks: readonly _AnyBlockDefinition[];

  /** themes from pressedslip — named builtin ThemeTemplates. */
  const themes: {
    readonly default: _ThemeTemplate;
    readonly mono: _ThemeTemplate;
    readonly compact: _ThemeTemplate;
  };

  /** loadThemeFonts() from pressedslip — fetches fonts and returns PreparedTheme. */
  function loadThemeFonts(
    theme: _ThemeTemplate,
    opts?: { cache?: _Cache },
  ): Promise<_PreparedTheme>;

  /** defineBlock() from pressedslip — creates a typed BlockDefinition. */
  function defineBlock<TData>(spec: {
    type: string;
    schema: import("zod").ZodType<TData>;
    render: (props: { data: TData; ctx: _RenderContext }) => import("react").ReactElement | null;
    shell?: {
      showTitle?: boolean;
      separator?: "thin" | "thick" | "none";
      padding?: "compact" | "normal" | "loose";
    };
    dependencies?: readonly string[];
    hints?: readonly string[];
  }): _BlockDefinition<TData>;

  /** compose() from pressedslip — orchestrates provider fetch + composition. */
  function compose(opts: {
    providers: Record<string, _ProviderDefinition<unknown>>;
    blocks: _Registry;
    date: string;
    mode?: string;
    cache?: _Cache;
    ctx?: { subjectId?: string; hour?: number; [key: string]: unknown };
    [key: string]: unknown;
  }): Promise<_Composition>;

  // pressedslip/providers functions
  /** createProviderRegistry() from pressedslip/providers. */
  function createProviderRegistry<R extends Record<string, _ProviderDefinition<unknown>>>(
    providers: R,
  ): R;

  /** defineProvider() from pressedslip/providers. */
  function defineProvider<T>(spec: {
    key: string;
    scope: "shared" | "personal";
    freshness: "per-day" | "per-hour" | "never" | "always-fetch";
    timeoutMs?: number;
    fetch(ctx: {
      date: string;
      hour?: number;
      subjectId?: string;
      random: () => number;
      cache: _ReadOnlyCache;
      userCtx: Readonly<Record<string, unknown>>;
    }): Promise<
      | { ok: "data"; value: T }
      | { ok: "suppressed" }
      | { ok: "error"; reason: { name: string; message: string } }
    >;
  }): _ProviderDefinition<T>;

  /** createStaticTextProvider() from pressedslip/providers. */
  function createStaticTextProvider(opts: {
    key: string;
    value: string;
  }): _ProviderDefinition<string>;

  /** createFixturePoolProvider() from pressedslip/providers. */
  function createFixturePoolProvider(opts: {
    key: string;
    pool: string[];
    scope?: "shared" | "personal";
    freshness?: string;
  }): _ProviderDefinition<string>;

  /** createOpenMeteoProvider() from pressedslip/providers. */
  function createOpenMeteoProvider(opts: {
    key: string;
    [key: string]: unknown;
  }): _ProviderDefinition<unknown>;

  // pressedslip/transports functions
  /** createHttpTransport() from pressedslip/transports. */
  function createHttpTransport(config: {
    url: string;
    headers?: Record<string, string>;
    allowedHosts?: readonly string[];
    timeoutMs?: number;
  }): { send: (payload: { bytes: Uint8Array; mimeType?: string }) => Promise<void> };

  /** createEscPosTransport() from pressedslip/transports. */
  function createEscPosTransport(config: {
    host: string;
    port: number;
    feedLines?: number;
    cut?: boolean;
    timeoutMs?: number;
  }): { send: (payload: { bytes: Uint8Array; mimeType?: string }) => Promise<void> };

  /** createFileTransport() from pressedslip/transports. */
  function createFileTransport(config: { path: string; mode?: number }): {
    send: (payload: { bytes: Uint8Array; mimeType?: string }) => Promise<void>;
  };

  /** transportError() from pressedslip/transports — creates a tagged Error. */
  function transportError(code: string, message: string, cause?: unknown): Error;

  // ---------------------------------------------------------------------------
  // Module shims for external packages not bundled with pressedslip
  // ---------------------------------------------------------------------------
}

// NOTE: `declare module "external-pkg"` blocks must live in a non-module .d.ts
// file (one without top-level `import` statements). See doc-snippets-shims.d.ts
// for external-package shims (zod is resolved via node_modules; @aws-sdk/client-s3
// and @resvg/resvg-wasm/index_bg.wasm?url are shimmed there).
