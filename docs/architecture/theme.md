# Theme subsystem

## Purpose

A **Theme** is a cohesive visual identity for a receipt. It bundles two
concerns into one composable value:

1. **Font stack** — URL-based declarations (`roleUrls`, `extraUrls`) that
   `loadThemeFonts()` fetches, caches, and resolves into binary font data.
2. **Chrome styling** — `shell` and `header` fields that control the title
   strip, block separators, padding, and header layout.

Themes govern the chrome, not block internals. The visual voice of an
individual block (KPI's 36 px display value, quotation's italic style) lives
inside the block's render function and is not addressable via a theme. To alter
block internals, fork the block with `defineBlock`.

### How a theme composes with blocks and the shell

At render time the pipeline assembles a receipt in three layers:

```
render(composition, { registry, theme })
  └─ loadThemeFonts(template)      ← resolves ThemeTemplate → PreparedTheme
       └─ composeTree(composition, { prepared })
            ├─ ShellTop            ← receives prepared.header via prop
            ├─ BlockShell × N      ← receives prepared.shell via prop
            │    └─ block render() ← theme-unaware; accesses only typed data
            └─ ShellBottom
```

Theme data flows through **explicit prop threading**, not React Context. Satori
does not mount React hooks, so context would silently produce undefined values
at render time (ADR-0021, codex F1).

`BlockShell` reads `prepared.shell` for its defaults, then overlays per-block
`BlockShellOptions` on top. The block definition's `shell` field (`showTitle`,
`separator`, `padding`) overrides the theme-level default for that property. If
a block omits a `shell` field, the theme value applies. If no theme is provided,
`SHELL_DEFAULTS` from `src/themes/apply-defaults.ts` applies.

---

## Canonical diagrams

The rendered output of the default theme across a representative composition:

![Default theme visual reference](../assets/visual-refs/theme-default.png)

The inverted black title bars, Inter sans-serif body text, thin block
separators, and 24 px header padding are all driven by `themes.default`. None
of those properties are embedded in the block definitions.

---

## Invariants

The following invariants are enforced by the type system, by
`loadThemeFonts()`, or by the render pipeline.

### Font loading

1. **`roleUrls` must declare at least the `body` role.** The `body` role is
   what `ShellTop` falls back to for the name and date text when a more
   specific role (`display`, `mono`) is absent from `fontRoles`. A theme
   without `body` produces a receipt with no fonts, which causes satori to
   silently omit text.

2. **Font files must be TTF or OTF.** Satori cannot parse WOFF2 and fails
   silently. All three builtin themes supply Google Fonts static TTF endpoints.
   See ADR-0021 §"Font URL format".

3. **`loadThemeFonts()` is the only path that produces a `PreparedTheme`.**
   The `_kind: "prepared"` discriminant on `PreparedTheme` is set exclusively
   inside `loadThemeFonts()`. Constructing a `PreparedTheme` literal without
   calling `loadThemeFonts()` bypasses default merging and font deduplication.

4. **`render()` uses `_kind === "prepared"` to branch, not duck-typing.**
   Passing a `ThemeTemplate` to `render()` triggers implicit `loadThemeFonts()`
   internally. A `PreparedTheme` is used as-is, skipping the async fetch step.
   (ADR-0021, codex F2.)

5. **Font fetch failure throws by default.** `loadThemeFonts()` resolves each
   URL via `Promise.allSettled`. If any URL rejects and `onFontLoadError` is
   `"throw"` (the default), the whole prepare call throws. Set
   `onFontLoadError: "warn-skip"` to degrade gracefully.

### Override precedence for shell and padding

This is the area relevant to "custom theme's padding is ignored."

```
SHELL_DEFAULTS
  ← overridden by theme.shell  (set in ThemeTemplate or via defineTheme)
      ← overridden by block definition's shell.padding / shell.separator
```

Concretely, inside `BlockShell`:

```ts
const t = theme ?? SHELL_DEFAULTS;          // theme prop is prepared.shell
const separator = options?.separator ?? t.separatorThickness;
const padding   = options?.padding   ?? t.contentPadding;
```

- `options` is the block definition's `BlockShellOptions` (static, set by the
  block author via `defineBlock`).
- `theme` is `prepared.shell`, the resolved `Required<ShellTheme>` from
  `loadThemeFonts()`.

**If `options.padding` is set in the block definition, it wins over the
theme.** The theme's `contentPadding` value applies only when the block
definition leaves `padding` undefined. A custom theme whose `contentPadding`
appears to be ignored is most likely being overridden by the block definition's
explicit `shell.padding` field.

To verify: inspect the block definition's `shell` object. If it sets `padding:
"normal"` explicitly, that overrides any theme padding value. Omitting the key
(not setting it to `undefined` explicitly) is sufficient for the theme to take
effect.

### Header defaults

`loadThemeFonts()` calls `applyHeaderDefaults(template.header)` before
constructing the `PreparedTheme`. This merges `template.header` over
`HEADER_DEFAULTS` (spread: `{ ...HEADER_DEFAULTS, ...template.header }`).
Any field absent from `template.header` receives its value from
`HEADER_DEFAULTS`, not from the block defaults. The same pattern applies to
`applyShellDefaults(template.shell)`.

### Node-only caching

`nodeFontCache()` imports `node:fs/promises`, `node:crypto`, `node:os`, and
`node:path`. It is exported only from the `pressedslip/providers` subpath. It
is never re-exported from `src/themes/index.ts` because static bundler tracing
would pull Node-only APIs into the browser-safe bundle (ADR-0021 §"Node-only
`nodeFontCache` packaging").

---

## ADR cross-references

| ADR | Relevance |
|-----|-----------|
| [ADR-0017 — font-loader-fetch-only](../adrs/0017-font-loader-fetch-only.md) | `loadThemeFonts` uses fetch-only; `file://` URLs are unsupported |
| [ADR-0020 — shell-theme-adoption](../adrs/0020-shell-theme-adoption.md) | Introduced `BlockShellOptions.titleFontFamily` (now deprecated) and established the visual defaults that became the `default` theme's shell |
| [ADR-0021 — theme-primitive](../adrs/0021-theme-primitive.md) | Defines the theme contract: font roles, title-strip styles, explicit prop threading, `PreparedTheme._kind` discriminant, `nodeFontCache` packaging split |

---

## Code anchors

### `src/themes/index.ts`

Public entrypoint for the theme subsystem. Re-exports all types, the
`defineTheme` identity helper, `loadThemeFonts`, the `themes` builtin catalog,
and the default/shell merge utilities. Does NOT re-export `nodeFontCache`.

### `src/themes/types.ts`

All type definitions: `FontRole`, `FontUrlSpec`, `ShellTheme`, `HeaderTheme`,
`ThemeTemplate`, `PreparedTheme`, `ThemeInput`, `FontCache`.

- `ThemeTemplate` — consumer-authored input; font URLs, partial shell/header.
- `PreparedTheme` — output of `loadThemeFonts`; binary fonts, fully-resolved
  `Required<ShellTheme>` and `Required<HeaderTheme>`, `_kind: "prepared"`.

### `src/themes/apply-defaults.ts`

Exports `SHELL_DEFAULTS`, `HEADER_DEFAULTS`, `applyShellDefaults()`, and
`applyHeaderDefaults()`. These are called by `loadThemeFonts` to fill in
missing fields before constructing a `PreparedTheme`. `SHELL_DEFAULTS` is also
used as the fallback inside `BlockShell` when no theme is threaded in.

Default values for padding-relevant fields:

```
SHELL_DEFAULTS.contentPadding     = "normal"   // → 16 px vertical
HEADER_DEFAULTS.padding           = 24          // header vertical padding px
```

### `src/themes/load.ts` — `loadThemeFonts()`

Accepts a `ThemeTemplate` and returns a `Promise<PreparedTheme>`. Fetches all
URLs in `roleUrls` and `extraUrls` via the provided `FontCache` (default:
module-level memory singleton). Deduplicates the flat `fonts[]` array by
`name+weight+style`. Calls `applyShellDefaults` and `applyHeaderDefaults` to
produce `Required<>` shell and header on the returned `PreparedTheme`.

```ts
// src/themes/load.ts — final return statement
return {
  _kind: "prepared",
  id: template.id,
  label: template.label,
  fonts: Array.from(dedup.values()),
  fontRoles,
  shell: applyShellDefaults(template.shell),   // ← merges over SHELL_DEFAULTS
  header: applyHeaderDefaults(template.header), // ← merges over HEADER_DEFAULTS
};
```

### `src/themes/builtins/index.ts` — `themes`

Registry of the three builtin `ThemeTemplate` objects:

| Key | File | Font | Title style |
|-----|------|------|-------------|
| `themes.default` | `builtins/default.ts` | Inter | `"block"` (inverted bar) |
| `themes.mono` | `builtins/mono.ts` | JetBrains Mono | `"hash"` |
| `themes.compact` | `builtins/compact.ts` | Atkinson Hyperlegible | `"plain"` |

### `src/shell/BlockShell.tsx`

Renders the title strip, content padding, and bottom separator for each block.
Reads `theme` prop (`prepared.shell`) for defaults; `options` prop
(`BlockShellOptions` from the block definition) overrides individual fields.
Override precedence is coded explicitly at lines 31–35:

```ts
const t = theme ?? SHELL_DEFAULTS;
const separator = options?.separator ?? t.separatorThickness;
const padding   = options?.padding   ?? t.contentPadding;
```

This is the first place to inspect when a theme padding value appears to be
ignored.

### `src/fonts.ts` — `loadFontFromBuffer`, `loadFontFromUrl`

Low-level font loaders. `loadThemeFonts` calls `loadFontFromBuffer` internally
after fetching each URL. `loadFontFromUrl` is the standalone helper for
consumers who load individual fonts outside the theme system. Neither function
handles caching — caching is the responsibility of `loadThemeFonts`.
