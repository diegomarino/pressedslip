# Issue #18: Image Block Implementation Plan

Status: implemented and reviewed locally; full acceptance verification passed on Node 22 and Node 24.

## Goal and scope

Implement builtin `image` for a column of 1–12 consumer-provided PNG/SVG data URIs. Export `imageBlock`, `ImageData`, and browser-safe `imageFromBuffer(bytes: Uint8Array, mime: "image/png" | "image/svg+xml"): string` from root and `/browser`; expose `imageFixtures` and `builtinFixtures.image` from `/testing`.

Keep the issue's required `layout: "column"`, default `fit: "reduce"`, default `dither: "floyd-steinberg"`, optional positive integer `maxHeight`, and optional per-image `alt` and dimension hints. No URL loading (#19), row/grid (#20), global dithering, or seed-composition change. The user approved adopting `fast-xml-parser` for XML syntax validation and SVG attribute inspection; select and verify the version, transitive dependencies, and actual browser bundle impact before integration.

The ZIP is reference material, not a commit to import. Keep its patch, drafts, scripts, and historical evidence out of the deliverable. Deliver only reviewed implementation, tests, current user documentation, ADR, and the newly generated image visual reference.

## Investigation evidence

Checkout: `feat/18-image-block`, base `8ba9530`. Probes ran on Node 26.9.0 using the installed dependencies, not the required Node 22/24 acceptance matrix.

Temporary reviewed/adapted probes: `out/image-investigation/`, ignored by Git. The remote-URL case was deliberately omitted.

- Existing `composeTree` catches synchronous block-render failures; later Satori decoding failures escape that boundary. Invalid PNG data and mismatched JPEG MIME reproduced whole-render rejection.
- `measureSvgBounds` tracks paths and group transforms, but ignores images. Two unshrinking 300 px images reproduced `canvasOverflow: null` despite cropping.
- Node/native and WASM returned identical 4,571-byte PNGs for the gradient probe. This is one sample, not general parity proof.
- A 600 px image centered within 528 px emitted `x="-36"`: cropping occurs on both sides, contrary to the issue's right-only contract.
- A malformed SVG (`<svg ...><path`) rendered blank without an exception. Checking only its root/dimensions cannot satisfy error isolation.
- An SVG without intrinsic dimensions failed in Satori even with explicit React image width/height. Dimension hints must be inserted into a normalized SVG source before handing it off.
- The playground palette and its variant verifier use manual catalogs, not automatic discovery from `builtinBlocks`.
- `fast-png` already exports `hasPngSignature` and `convertIndexedToRgb`. Its decoded output is not uniformly 8-bit RGBA: depth, channels, palettes, and transparency require normalization.
- The existing threshold classifies gray <= 128 as black; the supplied spike uses < 128. Lock the production boundary explicitly.

## Approved decisions

1. Preserve the issue API and architecture; preprocess PNGs locally inside synchronous block rendering. Keep SVGs as vectors.
2. Center images that fit. Anchor oversized `fit: "none"` images at the content area's left edge so cropping is right-only. Approved: apply explicit `maxHeight` proportionally even for `none`, following the issue's algorithm; warn based on final rendered width.
3. Keep the issue's simple limits: 1–12 images and 2 MiB decoded source bytes per image, including UTF-8 SVG. The user rejected adding per-image and aggregate megapixel budgets for this simple-image use case. Retain basic finite positive dimension and allocation arithmetic validation, with clear failures; do not add configurable resource budgets. The payload cap does not bound decoded memory or guarantee that a complete slip meets the transport's 4096-dot height limit.
4. Approved: use `fast-xml-parser` for shared browser-safe XML syntax validation and attribute inspection rather than implementing an XML parser. Keep XML well-formedness separate from pressedslip SVG acceptance rules: SVG root, usable dimensions/viewBox, no executable content or external resource references, and rejection of DTD/custom entities. Normalize missing intrinsic dimensions from hints. Library validation does not guarantee renderability; test actual image pixels and failure isolation. Verify the chosen package version, transitive dependencies, and bundle impact before integration.
5. Do not modify generic render/error contracts to solve image-specific failures. Respect existing `onBlockError: "throw"`; failure isolation applies to the default policy.

## Task 1 — Image overflow detection

Modify `src/pipeline/measure-svg-bounds.ts`; extend `src/pipeline/__tests__/measure-svg-bounds.test.ts` and `tests/integration/canvas-overflow.test.tsx`.

- [x] Add RED cases for visible image x + width beyond the canvas, translated groups, and images inside definition/clipped groups.
- [x] Extend the existing walker for image extents, preserving group clipping behavior. Satori's per-image mask/clip attributes must not cause every image to be skipped.
- [x] Run focused tests to GREEN and confirm existing path/intentional-clipping cases remain valid.

## Task 2 — Source validation and PNG preparation

Create focused helpers under `src/blocks/image/`: `source.ts` (URI parsing, bounded bytes, SVG validation/measurement/normalization, public buffer helper) and `raster.ts` (PNG normalization, resampling, threshold/dither). Split only if these grow beyond clear responsibilities. Put whitebox tests under `src/blocks/image/__tests__/`.

- [x] RED tests: strict base64/UTF-8 round trips; offset Uint8Array views; empty/truncated/wrong-MIME input; exact payload boundary; invalid/non-finite dimensions; SVG cases listed above; explicit dimensions/viewBox/hints precedence.
- [x] Reuse `fast-png` signature, decoder, palette conversion, and grayscale encoder. Validate IHDR dimensions before decode; check CRC; normalize grayscale/RGB/alpha/palette and low/16-bit samples correctly.
- [x] Composite alpha over white and derive luminance from all RGB channels before resampling. Preserve 0/255 pixels at natural size.
- [x] RED numerical cases for area/box downsampling, bilinear enlargement, non-integer scaling, 1-pixel dimensions, a fixed 4x4 Floyd–Steinberg golden, threshold 128, and dither idempotence.
- [x] Implement deterministic final-size processing, then run focused tests to GREEN. Keep all failures synchronous and indexed when called by the block.

## Task 3 — Block and public integration

Create `src/blocks/image.tsx` and `image.fixtures.ts`; update `src/index.ts`, `src/browser/index.ts`, and `src/testing/index.ts`. Add public tests in `tests/unit/blocks/image.test.tsx`, overflow audit cases in `src/blocks/__tests__/canvas-overflow-audit.test.tsx`, and image shapes in `tests/integration/render-engine-parity.test.ts`.

- [x] RED schema cases for required column layout, defaults, 1–12 images, supported data URI forms, positive hints/maxHeight, and clear URL/format rejection.
- [x] RED sizing cases on thermal58/80/110: narrow/wide images for every fit, proportional maxHeight, integer dimensions, tiny content budgets, and right-only cropping plus structured warning for oversized final width.
- [x] Implement `budget = ctx.contentWidth - 16`, proportional scale and floor-to-at-least-one output dimensions, 8 px padding/gap, and no flex shrinking. Normalize SVG sources when hints supply missing intrinsic dimensions.
- [x] RED end-to-end cases: corrupt PNG/SVG yields an indexed failed image slot while a valid KPI survives; strict error policy still throws; render performs no network I/O.
- [x] Verify Node/WASM byte equality for PNG alpha, gradient/default dither, threshold mode, and SVG. Assert actual image pixels so two blank renders cannot pass as success.
- [x] Add compact reviewed fixtures covering fit modes, SVG hints, alpha, and dithering. Update only the public-surface snapshot test deliberately and inspect the diff.

## Task 4 — Playground, documentation, and acceptance

Create `apps/playground/src/variants/image.ts`; update `apps/playground/src/variants/index.ts` and `apps/playground/scripts/verify-variants.mjs`. Add a small image interaction/render case to existing playground tests. Leave seed data unchanged.

Create `docs/blocks/image.md` and a new numbered ADR for explicit layout choices; update README/catalog references, `docs/api/README.md` where needed, `docs/guide/custom-block-walkthrough.md`, `examples/README.md`, and `examples/weather/README.md`. Update `scripts/docs/render-visual-refs.ts` and generate/review `docs/assets/visual-refs/block-image.png`.

- [x] Document accepted SVG boundary, PNG support, payload cap and dimension validation, fit/maxHeight behavior, dither defaults, pixel-preserving logos/QR usage, dimension hints, and the complete-slip transport height distinction.
- [x] Verify the image is selectable and renders in the playground; verify bundle size rather than assuming no dependency means no growth.
- [x] Run the full `pnpm verify` gate, including 85% lines/functions/statements and 75% branches, browser bundle checks, replay checks, and playground unit/build/variant/bundle/Playwright checks.
- [x] Run required checks under Node 22 and 24 using available runtimes; report any unavailable matrix leg explicitly. Treat an EACCES/EPERM test failure by reproducing its actual cause, not assuming the ZIP note explains it.
- [x] Review every changed file and generated image. Keep ZIP and temporary probes excluded; any future staging must use explicit reviewed paths. Check the final diff and clean up only this task's temporary probes.

## Review outcome

The user approved implementation of this scope, including the XML dependency and simple payload limits. No push, PR publication, or merge is authorized. Independent review found malformed XML entity handling; regression tests now reject uppercase predefined entities and verify indexed failure isolation. Additional regressions cover missing SVG namespaces, invalid XML characters, unsupported SVG text, and actual rendered pixels. The playground test checks a taller rendered output, catching missing renderer registration.

## Acceptance evidence

Full `pnpm verify` passed on Node 22.23.3 and Node 24.21.0: 95 package test files / 612 tests, 33 playground unit tests, and 13 Chromium tests. Coverage: 95.55% lines, 96.13% functions, 94.69% statements, 86.73% branches. Native/WASM image parity, public exports, browser compatibility, documentation snippets, replay, and bundle limits passed. Playground JavaScript bundle: 1,818 KiB against a 2,048 KiB limit. Temporary research probes were removed; the original ZIP remains untracked. Changes remain uncommitted on `feat/18-image-block`.

Follow-up Tux example: the user-selected Wikimedia SVG uses unsupported filters, so it was reviewed and rasterized locally to a 216 × 256 PNG. Added a playground variant, retained attribution and the original redistribution notice, and reviewed its dithered output. Playground verification passed on Node 22 with 33 unit tests and 14 Chromium tests, including Tux rendering; bundle size remains below the existing limit.
