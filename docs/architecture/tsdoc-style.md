# TSDoc style guide

Every public symbol — re-exported from `src/index.ts` or one of the four
subpath barrels (`src/providers/index.ts`, `src/browser/index.ts`,
`src/transports/index.ts`, `src/testing/index.ts`) — carries TSDoc matching
the template below. TypeDoc renders the result into `docs/api/reference/`
(regenerated locally; not committed). The TypeDoc CI gate fails on missing-doc
warnings, so every public symbol needs at minimum a summary line.

## Required tags

- **One-line summary** (no tag): imperative for verbs ("Renders a composition…",
  "Creates a registry…"); descriptive for nouns and types ("Per-block timing
  telemetry", "Configuration object for the file transport"). ≤120 characters.
  Period-terminated.
- **`@param <name> - <description>`** — one line per parameter. The dash
  separator after the name is mandatory; typedoc renders it as a definition
  list. Describe purpose, not the type (the signature already conveys the
  type). For object parameters, document each nested key on its own line:
  `@param opts.key - …`. Omit `@param` for declarations that have no
  parameters (types, classes, consts).
- **`@returns <description>`** — functions only. Describe what the value
  represents and when nullish/sentinel values appear. Omit for `void` or
  trivial identity returns.
- **`@example`** — exactly one. Always wrapped in a `` ```ts `` …  `` ``` ``
  fenced block so typedoc syntax-highlights it. Code must compile if pasted
  into a fresh consumer project that imports from the published package name:
  `import { … } from "pressedslip"` (root) or `"pressedslip/<subpath>"`. Use
  real types and real data. Multi-line is fine; prefer it over one-liners
  when the call has more than two arguments.

## Optional tags

- **`@template <T> - <description>`** — for generics whose role is not obvious
  from the parameter list.
- **`@throws {<ErrorClass>} <description>`** — when a function can throw a
  non-trivial error class. Document each distinct error code on its own line
  (see `src/transports/escpos.ts` for the canonical example).
- **`@see {@link OtherSymbol}`** — sparingly; only when the linked symbol is
  non-obvious from context.
- **`@deprecated <since> - <replacement>`** — when a symbol exists for
  backward compatibility.
- **`@remarks`** — only for non-trivial caveats that don't fit the summary
  line (browser-safety constraints, ordering invariants, performance notes).

## Voice + conventions

- **Voice:** imperative for verbs ("Creates a registry", "Renders a
  composition"). Descriptive for nouns and types ("A frozen array of builtin
  block definitions", "Configuration object passed to `createFileTransport`").
- **Avoid:** "this function", "the parameter", "should be", "is used to".
  Lead with the verb.
- **Code blocks in `@example`** use the package's published import path:
  `import { … } from "pressedslip"` or `"pressedslip/<subpath>"`. Never use
  relative paths.
- **String literals** in prose are double-quoted (`"shared"`, `"per-day"`) to
  match the JSON / TS convention used in the codebase.
- **No TODOs** in published TSDoc. Open a GitHub issue and reference it from
  the source comment near the symbol if needed; don't pollute the public
  reference.

## Where TSDoc lives

- For symbols defined in their own file, the TSDoc lives at the definition
  site — not at any re-export site.
- For re-exported types (`export type { X } from "./types.js"`), the TSDoc
  lives at the `interface` / `type` declaration in the origin file.
- The barrel files (`src/index.ts`, `src/<subpath>/index.ts`) carry a
  `@fileoverview` describing the subpath's purpose; individual symbols are
  not re-documented there. The one exception is `src/browser/index.ts`, which
  re-declares `builtinBlocks` locally to avoid pulling Node-only deps into
  the browser bundle — that local declaration carries full TSDoc.
- `@fileoverview` is a single sentence describing the file's role in the
  public surface. TypeDoc renders it on module pages and it documents intent for
  contributors.

## Verification

```bash
pnpm docs:api    # runs typedoc; fails on missing-doc warnings
pnpm verify      # full repo gate (typecheck + tests + bundle + docs)
```

The TypeDoc CI check is the mechanical enforcement layer: every public
symbol must produce a non-empty doc page, and every `@example` must
typecheck against the published `.d.ts` files.

## Reference examples

For canonical examples of the template applied well, see:

- **Function with throws + multi-line example:**
  [`createEscPosTransport`](../../src/transports/escpos.ts) — full template
  including `@throws` per error code.
- **Generic identity helper:** [`defineProvider`](../../src/providers/define-provider.ts)
  — minimal template with `@template`-style inference documented in prose.
- **Frozen-data constant:** [`builtinBlocks`](../../src/index.ts) — noun-form
  summary, no `@param`/`@returns`, browser-bundle caveat in `@remarks`-style
  prose.
- **Assertion helper:** [`assertBlockCount`](../../src/testing/index.ts) —
  `@throws` documents the assertion-failure contract.
