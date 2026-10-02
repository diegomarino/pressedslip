/** @fileoverview Compile both public helper/type entrypoints and existing cache compatibility. */

import {
  type ImageCache,
  type ImageFromUrlOptions,
  imageFromUrl,
  memoryFontCache,
} from "pressedslip";
import {
  type ImageCache as BrowserImageCache,
  type ImageFromUrlOptions as BrowserOptions,
  imageFromUrl as browserImageFromUrl,
} from "pressedslip/browser";
import { nodeFontCache } from "pressedslip/providers";
import { describe, expectTypeOf, it } from "vitest";

describe("image URL public types", () => {
  it("exposes the same helper and options in root and browser", () => {
    expectTypeOf(browserImageFromUrl).toEqualTypeOf(imageFromUrl);
    expectTypeOf<BrowserImageCache>().toEqualTypeOf<ImageCache>();
    expectTypeOf<BrowserOptions>().toEqualTypeOf<ImageFromUrlOptions>();
    expectTypeOf(imageFromUrl).returns.toEqualTypeOf<Promise<string>>();
    const cache: ImageCache = memoryFontCache();
    const disk: ImageCache = nodeFontCache({ dir: "/tmp/dedicated-images" });
    const options: ImageFromUrlOptions = {
      cache,
      fetch: globalThis.fetch,
      timeoutMs: 5000,
      maxBytes: 1024,
    };
    expectTypeOf(options).toEqualTypeOf<ImageFromUrlOptions>();
    expectTypeOf(disk).toEqualTypeOf<ImageCache>();
  });
});
