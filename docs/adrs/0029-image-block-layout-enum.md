# ADR-0029: Image block uses an explicit layout enum

- **Status:** accepted
- **Date:** 2026-10-01
- **Deciders:** Diego Marino
- **Tags:** blocks, api-surface, layout

## Context and problem statement

Issue #18 adds a generic image shape. Column rendering is the current scope;
row and grid layouts would require different sizing and overflow behavior.
Consumers need a clear contract rather than an implicit layout inferred from
image count.

## Decision outcome

Require `layout: "column"` in the image data schema. Keep a single image block
and reject unsupported layout values. Do not implement row/grid modes or an
automatic layout heuristic as part of #18.

Sizing remains explicit through `fit` and optional `maxHeight`. Natural-size
images wider than their budget align left and crop on the right. Image loading
belongs to the consumer; this block accepts local PNG/SVG data URIs only.

The layout is a consumer-chosen presentation value, like list separators,
not a theme-identity switch. This is compatible with ADR-0027; row/grid can
be additive enum members without sibling blocks.

## Consequences

- Layout is visible in saved compositions and schema validation.
- Future layouts can extend the enum with their own sizing rules and tests.
- Even a single image requires the explicit column value.

## Links

- [Issue #18](https://github.com/diegomarino/pressedslip/issues/18)
- [Image block reference](../blocks/image.md)
- [ADR-0027: Variants versus theme tokens](0027-block-variants-vs-theme-tokens.md)
- [ADR-0012: Visual shape taxonomy](0012-visual-shape-block-taxonomy.md)
