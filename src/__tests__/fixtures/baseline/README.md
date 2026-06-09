# Baseline regression fixtures

## baseline.png

PNG bytes produced by the `render()` call with `{ fonts: [Inter-Regular, Inter-Bold] }`
on the canonical composition in `baseline.composition.json`. Captured before the
theme-primitive shell refactor as the pre-refactor reference.

The regression test (`src/__tests__/regression/baseline.test.ts`) asserts that
rendering the same composition WITH the `themes.default` theme produces
byte-identical output. This is the anchor against which the
"default theme renders byte-identical to the pre-refactor baseline" claim is
verified.

If the bytes ever need to change (intentional visual update), regenerate this
fixture via a similar one-shot script, re-document the rationale in a new ADR,
and update this README.
