# image

## Purpose

Renders a column of consumer-provided PNG or SVG images. Use it for logos,
illustrations, QR images, and simple graphics. Rendering performs no image
fetches: load or generate bytes in your application first.

## Data schema

```ts
{
  layout: "column"; // required; row/grid are not supported
  fit?: "reduce" | "extend" | "none"; // default: reduce
  dither?: "floyd-steinberg" | "none"; // default: floyd-steinberg
  maxHeight?: number; // positive integer, per image
  images: {
    src: string; // PNG/SVG data URI
    alt?: string;
    width?: number; // positive integer fallback dimension
    height?: number; // positive integer fallback dimension
  }[]; // 1–12 images
}
```

Zod validates the shape and supplies defaults. Each decoded source must contain
1 byte to 2 MiB, excluding the data URI prefix and base64 encoding overhead.
Accepted forms are `data:image/png;base64,...`, `data:image/svg+xml;base64,...`,
and `data:image/svg+xml;utf8,...` (percent-encode SVG markup). URLs, JPEG, GIF,
and WebP are rejected; convert unsupported raster formats to PNG first.

## Examples

```ts
import { imageFromBuffer, type ImageData } from "pressedslip";

const imageData: ImageData = {
  layout: "column",
  images: [{ src: imageFromBuffer(bytes, "image/png"), alt: "Receipt logo" }],
};
```

`bytes` is a `Uint8Array` supplied by your application. The helper also accepts
Node buffers and byte-array views, and is exported from `pressedslip/browser`.
It checks payload size and the PNG header or SVG syntax/safety before encoding.
Full PNG decoding and final-size processing happen when the block renders.

```jsonc
// SVG with no intrinsic size: supply both dimension hints.
{
  "blockType": "image",
  "data": {
    "layout": "column",
    "fit": "none",
    "dither": "none",
    "maxHeight": 100,
    "images": [{
      "src": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
      "width": 32,
      "height": 32,
      "alt": "Black square"
    }]
  }
}
```

## Loading a URL before rendering

```ts
import { imageBlock, imageFromUrl } from "pressedslip";

const tuxUrl = "https://raw.githubusercontent.com/diegomarino/pressedslip/663028ea9ce813192efec798323b5cadd382fffd/docs/assets/visual-refs/block-image-tux.png";
const imageData = imageBlock.schema.parse({
  layout: "column",
  images: [{ src: await imageFromUrl(tuxUrl), alt: "Tux" }],
});
```

This pinned URL serves the existing [rendered Tux PNG](../assets/visual-refs/block-image-tux.png),
not the original filtered SVG. Attribution remains Larry Ewing and The GIMP;
vector work by Simon Budig and Garrett LeSage, with the
[original redistribution notice](../../apps/playground/src/variants/assets/README.md).

`imageFromUrl` is also exported from `pressedslip/browser`. Only absolute HTTP(S)
URLs are accepted. PNG signatures and the existing SVG XML validator determine
format; URL extensions and Content-Type headers are ignored. Unsupported formats
use the image schema's guidance; recognizable malformed PNG/SVG payloads keep
their validation diagnostics. PNG headers are validated before encoding; corrupt
pixel data can still produce an indexed block failure during rendering.

The default `timeoutMs` is 5000 and covers both the request and the entire streamed
body, including stalls after headers. Injected `fetch` implementations must honor
the provided abort signal. The helper clears its timer, requests cancellation, and
releases body readers on failure without waiting for cancellation to finish.
Network and body-read TypeErrors become ordinary errors with the original cause,
so provider failures remain isolated; invalid arguments still throw TypeError.
It checks usable Content-Length headers early and counts
actual bytes even when the header is absent or false. Empty bodies fail.
`maxBytes` defaults to 2,097,152 (2 MiB); a smaller cap is allowed, a larger value
is clamped to 2 MiB. Both options require positive safe integers, and `timeoutMs`
must not exceed 2,147,483,647 ms.

```ts
import { imageFromUrl, memoryFontCache, type ImageCache } from "pressedslip/browser";

// A dedicated existing byte cache instance; no new cache factory is needed.
const imageCache: ImageCache = memoryFontCache();
const src = await imageFromUrl(
  "https://raw.githubusercontent.com/diegomarino/pressedslip/663028ea9ce813192efec798323b5cadd382fffd/docs/assets/visual-refs/block-image-tux.png",
  { cache: imageCache, timeoutMs: 5000, maxBytes: 2 * 1024 * 1024 },
);
```

There is no cache by default. Cache keys are
`pressedslip:image:v1:<normalized-url-without-fragment>` and values are raw bytes.
Hits are validated again against the current cap and format rules. Only validated
loads are saved; cache errors propagate. There is no TTL, retry, or concurrent
request deduplication. Node consumers can use `nodeFontCache({ dir })` from
`pressedslip/providers` with a dedicated image directory.

Normal fetch/CORS restrictions apply. HTTP-only validation is not an SSRF policy:
applications accepting untrusted URLs must enforce host and redirect restrictions
through their injected fetch. Fetch, timeout, status, and validation failures reject
the helper promise. Catch them in application code or use the
[complete provider wiring example](../guide/providers.md#loading-an-image-url).
Resolve URLs before `compose()`/`render()`; automatic URL resolution in JSON is
deferred in the package. The Playground accepts HTTP(S) image sources in its
editor and resolves them with this helper before calling render. The editor keeps
the URL. A failed URL skips its image block while the other blocks still render;
the browser console logs the URL, image index, block index, and error. Fix the URL
and click Render again.
Select `image · Tux (URL)`, edit `images[].src`, and click Render.

The optional live smoke is separate from all offline verification:

```bash
pnpm build
node scripts/smoke-image-url.mjs --live
```

It explicitly fetches the pinned URL once, compares it with the existing local
PNG, and checks both built public helpers. No image network request is made by
`pnpm verify`.

## Layout notes

The column has 8 px padding and 8 px gaps. The image width budget is the shell's
content width minus 16 px. Images retain their aspect ratio; output dimensions
are floored to integers, with a minimum of 1 px. Images do not flex-shrink.

| Fit | Behavior |
|---|---|
| `reduce` | Shrinks images wider than the budget; never enlarges. |
| `extend` | Scales up or down to the width budget. |
| `none` | Keeps natural size unless `maxHeight` requires reduction. |

`maxHeight` reduces any fit mode proportionally, including `none`. Images that
fit are centered. Oversized final images align left, emit a structured warning,
and any cropping at the canvas edge occurs only on the right. Images extending
beyond that edge also report canvas overflow according to the render option's policy.

PNG dimensions come from the file. SVG dimensions come from usable intrinsic
width/height or `viewBox`; hints are used only when intrinsic size cannot be
measured. Fallback dimensions are inserted into the SVG before Satori receives
it. Hints do not override an existing measurable image size.

## PNG processing

PNG pixels are decoded locally, composited over white, converted to grayscale,
and resampled to final size before binarization. Reduction uses area sampling;
enlargement uses bilinear sampling. The default Floyd–Steinberg dithering is
deterministic. `dither: "none"` applies a threshold: grayscale values at or below
128 become black, higher values become white.

For already monochrome logos or QR images, use `fit: "none"` and
`dither: "none"`, omit a shrinking `maxHeight`, and provide an image that fits
the width budget. This preserves natural-size black/white pixels. SVG remains
vector content; PNG dithering does not apply to it. Prefer solid black shapes,
no gradients, and no text: the final pipeline thresholds midtones, and resvg
does not load system fonts for embedded SVG text.

## SVG acceptance and failures

XML syntax is validated with `fast-xml-parser`. The source must have an SVG root
and usable dimensions. Simple vector shapes, gradients, and local
fragment references are supported. Scripts, event handlers, embedded foreign
content, external resource references, DTDs, and custom entities are rejected.
Convert SVG text to paths; text elements are rejected because system fonts are
disabled. SVG support is a restricted static subset, not arbitrary browser SVG; XML
well-formedness alone does not guarantee renderability.

Invalid source data or decoding errors fail the image block slot and populate
`Rendering.failedBlocks`; the error identifies the image's zero-based index.
Other valid slots still render under the default error policy.
`onBlockError: "throw"` instead rejects the render.

The source byte cap does not bound decoded pixel memory or complete-slip height.
Use sensible image dimensions. The ESC/POS transport's 4096-dot height limit
applies to the complete slip, including shell, text, and all images.

## See also

- The playground's `image · Tux (URL)` example loads the existing rendered PNG
  from the pinned commit URL before rendering. The original
  [Wikimedia Commons Tux SVG](https://commons.wikimedia.org/wiki/File:Tux.svg)
  uses filters unsupported by the block. Artwork:
  Larry Ewing and The GIMP; vector work: Simon Budig and Garrett LeSage.
  See the [asset attribution and original redistribution notice](../../apps/playground/src/variants/assets/README.md).
  [Rendered example](../assets/visual-refs/block-image-tux.png).
- [Custom blocks](../guide/custom-block-walkthrough.md) — combine local imagery
  with text in a custom visual shape.
- [API reference](../api/README.md) — public imports and fixture exports.
- [ADR-0029](../adrs/0029-image-block-layout-enum.md) — explicit column layout.
## Theme-controlled dimensions

The surrounding shell follows the selected theme. Image sizes come from source
geometry and explicit fit/maxHeight, not theme identity.

## Block-local intent

Column layout, centered fitting images, 8 px padding/gaps, and PNG dithering are
block-local choices. Future alignment/gap options must preserve these defaults.
