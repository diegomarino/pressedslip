# ADR-0013: WidthSpec discriminated union and PAPER presets

- **Status:** accepted
- **Date:** 2026-05-19
- **Deciders:** Diego (solo)
- **Sub-project:** 1
- **Tags:** api-surface, rendering, dx

## Context and problem statement

A render width is not a paper size. Tying the renderer to physical paper dimensions — treating "80mm thermal" as the primary unit of measurement — is a category error that leaks hardware knowledge into what should be a pixel-pipeline. At the same time, forcing every caller to think in raw pixels means every caller must independently know that an 80mm thermal printer at 203 DPI produces 576 printable pixels. Neither extreme is right. The decision is how to expose the unit system so that callers who think in paper widths can be precise, callers who think in pixels can be exact, and the hardware metadata is visible but not load-bearing.

The reference implementation hardcoded `PRINT_WIDTH = 576` (marplanner audit finding L1). Any caller with a different printer width had to patch the constant.

## Decision drivers

- A pixel-pipeline renderer should work with pixel intent; paper dimensions are an input-conversion concern, not a rendering concern
- Callers with physical printers think in mm; callers with software pipelines think in px — both are valid
- Hardware metadata (paper roll width, edge margin, native DPI) is useful for admin UIs and documentation but must not affect rendering math
- Width must be divisible by 8 (1-bit PNG constraint); the API should enforce this, not delegate it to callers
- `PAPER` presets should encode the correct printable pixel width (margin already excluded), not the physical roll width

## Considered options

1. **Raw px field + named constants** — `width: number` in pixels; `PAPER_THERMAL80 = 576` as a loose constant
2. **Discriminated `WidthSpec` union** — `{ mm: number; dpi?: number } | { px: number }`; callers pick the unit that matches their intent
3. **Hybrid WidthSpec + PAPER presets** — discriminated union as above, plus a `PAPER` record of `PaperPreset` values that extend `WidthSpec` with informational hardware metadata

## Decision outcome

**Chosen option: hybrid WidthSpec + PAPER presets** — the renderer accepts `WidthSpec = { mm: number; dpi?: number } | { px: number }`. The mm branch converts to pixels internally (`ceil(mm × dpi / 25.4 / 8) × 8`) and warns if rounding changed the value. The px branch requires the value to already be divisible by 8; throws `RangeError` if not. `PAPER` presets are `PaperPreset = WidthSpec & { paperWidthMm?, edgeMarginPxPerSide?, nativeDpi?, description? }` — the hardware fields are informational only, not used in rendering math.

### PAPER presets shipped in sub-project 1

```
thermal58   → { px: 384 }   (58mm roll, ~48mm printable at 203 DPI)
thermal80   → { px: 576 }   (80mm roll, ~72mm printable at 203 DPI)
thermal110  → { px: 832 }   (110mm roll, ~104mm printable at 203 DPI)
a4Portrait  → { mm: 210 }
a4Landscape → { mm: 297 }
letterPortrait → { mm: 215.9 }
```

Default if `width` is omitted: `{ mm: 80, dpi: 203 }` → 576px (matches marplanner's hardcoded value).

### The `edgeMarginPxPerSide` invariant

`PaperPreset.edgeMarginPxPerSide` is informational only. The `px` value (or the mm→px result) already represents the printable area; the margin has been pre-excluded. Callers must NOT subtract `edgeMarginPxPerSide` from `px` to compute printable width — it is already correct.

### Positive consequences

- Marplanner's `PRINT_WIDTH = 576` becomes `PAPER.thermal80` — same value, but now self-documenting and overridable
- New printer models are added to `PAPER` without touching rendering logic
- Callers with non-standard widths use `{ mm: ... }` or `{ px: ... }` directly without needing a preset

### Negative consequences / trade-offs

- mm→px rounding can produce unexpected values for non-standard DPI; the warn-on-round behavior surfaces this rather than silencing it
- `PaperPreset` being a structural supertype of `WidthSpec` means the informational fields appear in the same object as the rendering fields; JSDoc must clearly label them as informational to prevent misuse

## Links

- [ADR-0011: Public API shape](0011-public-api-shape.md)

---

> **Append-only:** if this decision is reversed, write a new ADR that supersedes
> this one and update this ADR's status to `superseded by ADR-YYYY`. Do not
> rewrite history.
