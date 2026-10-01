/** @fileoverview Public image block contract, sizing, and fail-soft rendering tests. */
import { readFile } from "node:fs/promises";
import { decode, encode } from "fast-png";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { imageFromBuffer } from "../../../src/blocks/image/source.js";
import { imageFixtures } from "../../../src/blocks/image.fixtures.js";
import { imageBlock } from "../../../src/blocks/image.js";
import { kpiBlock } from "../../../src/blocks/kpi.js";
import { createRegistry, loadFontFromBuffer, render } from "../../../src/index.js";
import type { CompositionInput, RenderContext } from "../../../src/types.js";

const svg = (width = 100, height = 50) =>
  imageFromBuffer(
    new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}"/></svg>`,
    ),
    "image/svg+xml",
  );
const ctx = (contentWidth = 528) =>
  ({ contentWidth, logger: { warn: vi.fn() } }) as unknown as RenderContext;
const data = (src: string, extra = {}) =>
  imageBlock.schema.parse({ layout: "column", images: [{ src }], ...extra });
const child = (element: ReactElement | null) =>
  (element?.props as { children: ReactElement[] }).children[0] as ReactElement<{
    width: number;
    height: number;
    style: { alignSelf?: string };
    src: string;
  }>;
const composition = (src: string): CompositionInput => ({
  id: "image-test",
  version: 1,
  status: "ready",
  date: "2026-10-01",
  slots: [
    { index: 0, blockType: "image", data: { layout: "column", images: [{ src }] } },
    { index: 1, blockType: "kpi", data: { value: "42" } },
  ],
});

describe("image block", () => {
  it("defaults to reduce and Floyd–Steinberg and registers all fixtures", () => {
    expect(imageBlock.type).toBe("image");
    expect(data(svg())).toMatchObject({ fit: "reduce", dither: "floyd-steinberg" });
    for (const fixture of Object.values(imageFixtures))
      expect(
        imageBlock.render({ data: imageBlock.schema.parse(fixture), ctx: ctx() }),
      ).not.toBeNull();
  });
  it.each([
    "https://example.com/image.png",
    "data:image/jpeg;base64,AAAA",
    "data:image/png;base64,%%%",
  ])("rejects unsupported source %s", (src) =>
    expect(imageBlock.schema.safeParse({ layout: "column", images: [{ src }] }).success).toBe(
      false,
    ));
  it("requires column and one to twelve images and positive integer limits", () => {
    const input = { layout: "column", images: [{ src: svg() }] };
    for (const invalid of [
      { ...input, layout: "row" },
      { ...input, layout: undefined },
      { ...input, images: [] },
      { ...input, images: Array(13).fill(input.images[0]) },
      { ...input, maxHeight: 0 },
      { ...input, maxHeight: 1.5 },
      { ...input, images: [{ src: svg(), width: -1 }] },
    ])
      expect(imageBlock.schema.safeParse(invalid).success).toBe(false);
  });
  it.each([336, 528, 784])("fits images to content width %s", (contentWidth) => {
    for (const fit of ["reduce", "extend"] as const) {
      const img = child(
        imageBlock.render({ data: data(svg(1000, 200), { fit }), ctx: ctx(contentWidth) }),
      );
      expect(img.props.width).toBe(contentWidth - 16);
      expect(img.props.height).toBe(Math.floor((contentWidth - 16) / 5));
    }
  });
  it("keeps natural reduce size, enlarges extend, and applies maxHeight to none", () => {
    expect(child(imageBlock.render({ data: data(svg()), ctx: ctx() })).props).toMatchObject({
      width: 100,
      height: 50,
    });
    expect(
      child(imageBlock.render({ data: data(svg(), { fit: "extend" }), ctx: ctx() })).props,
    ).toMatchObject({ width: 512, height: 256 });
    expect(
      child(imageBlock.render({ data: data(svg(), { fit: "none", maxHeight: 25 }), ctx: ctx() }))
        .props,
    ).toMatchObject({ width: 50, height: 25 });
  });
  it("anchors oversized images left and warns based on final width", () => {
    const context = ctx();
    const img = child(
      imageBlock.render({ data: data(svg(800, 100), { fit: "none" }), ctx: context }),
    );
    expect(img.props.style.alignSelf).toBe("flex-start");
    expect(context.logger.warn).toHaveBeenCalledWith(
      "image wider than content width; cropped on the right",
      { naturalWidth: 800, availableWidth: 512, index: 0 },
    );
    imageBlock.render({ data: data(svg(800, 100), { fit: "none", maxHeight: 20 }), ctx: context });
    expect(context.logger.warn).toHaveBeenCalledTimes(1);
  });
  it("fails clearly when paper leaves no image budget", () =>
    expect(() => imageBlock.render({ data: data(svg()), ctx: ctx(16) })).toThrow(/content width/));
  it("normalizes an SVG using dimension hints", () => {
    const src =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
      );
    const parsed = imageBlock.schema.parse({
      layout: "column",
      images: [{ src, width: 10, height: 10 }],
    });
    const img = child(imageBlock.render({ data: parsed, ctx: ctx() }));
    expect(atob(img.props.src.split(",")[1] ?? "")).toContain('width="10"');
  });
  it.each([
    "data:image/png;base64,AAAA",
    `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="20" height="20"><rect width="20" height="20"/><title>&AMP;</title></svg>')}`,
    `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="10" height="10"><path')}`,
    `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="20" height="20"><rect width="20" height="20"/>\u0000</svg>')}`,
    `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="20" height="20"><text>A</text></svg>')}`,
  ])("isolates corrupt source from a valid KPI", async (src) => {
    const fonts = [
      await loadFontFromBuffer(
        "JetBrainsMono",
        new Uint8Array(await readFile("tests/fixtures/fonts/jetbrains-mono-regular.ttf")),
      ),
    ];
    const registry = createRegistry([imageBlock, kpiBlock]);
    const result = await render(composition(src), { registry, fonts });
    expect(result.failedBlocks).toHaveLength(1);
    expect(result.failedBlocks[0]).toMatchObject({ blockType: "image" });
    expect(result.failedBlocks[0]?.reason.message).toMatch(/image 0/i);
    await expect(
      render(composition(src), { registry, fonts, onBlockError: "throw" }),
    ).rejects.toThrow(/image 0/i);
  });
  it("prints pixels from a valid PNG and reports oversized image overflow", async () => {
    const fonts = [
      await loadFontFromBuffer(
        "JetBrainsMono",
        new Uint8Array(await readFile("tests/fixtures/fonts/jetbrains-mono-regular.ttf")),
      ),
    ];
    const bytes = encode({ width: 800, height: 10, channels: 1, data: new Uint8Array(8000) });
    const src = imageFromBuffer(bytes, "image/png");
    const base = composition(src);
    const comp = {
      ...base,
      slots: base.slots.map((slot) =>
        slot.index === 0
          ? { ...slot, data: { layout: "column", fit: "none", images: [{ src }] } }
          : slot,
      ),
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected network I/O"));
    const result = await render(comp, {
      registry: createRegistry([imageBlock, kpiBlock]),
      fonts,
      onCanvasOverflow: "ignore",
    }).finally(() => {
      try {
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
      }
    });
    expect(result.failedBlocks).toEqual([]);
    expect(result.canvasOverflow).not.toBeNull();
    expect(Array.from(decode(result.bytes).data).filter((v) => v === 0).length).toBeGreaterThan(
      5000,
    );
  });
});

it("preserves natural-size PNG pixels and prints a normalized hint-only SVG", async () => {
  const input = Uint8Array.of(0, 255, 255, 0);
  const source = imageFromBuffer(
    encode({ width: 2, height: 2, channels: 1, data: input }),
    "image/png",
  );
  const element = imageBlock.render({ data: data(source), ctx: ctx() });
  const png = child(element).props.src.split(",")[1] ?? "";
  expect(decode(Uint8Array.from(atob(png), (char) => char.charCodeAt(0))).data).toEqual(input);
  const { renderReactToSvg } = await import("../../../src/pipeline/satori-to-svg.js");
  const { svgToRgba } = await import("../../../src/pipeline/svg-to-bitmap.js");
  const hint = imageBlock.schema.parse(imageFixtures.svgHints);
  const inner = imageBlock.render({ data: hint, ctx: ctx() });
  if (inner === null) throw new Error("missing image element");
  const vector = await renderReactToSvg(inner, { width: 528, fonts: [] });
  const bitmap = svgToRgba(vector, 528);
  let black = 0;
  for (let i = 0; i < bitmap.rgba.length; i += 4) if (bitmap.rgba[i] === 0) black++;
  expect(black).toBe(40 * 24);
  const bare = imageBlock.schema.parse({
    layout: "column",
    images: [
      {
        src: `data:image/svg+xml;utf8,${encodeURIComponent('<svg width="20" height="20"><rect width="20" height="20"/></svg>')}`,
      },
    ],
  });
  const bareElement = imageBlock.render({ data: bare, ctx: ctx() });
  if (bareElement === null) throw new Error("missing image element");
  const bareBitmap = svgToRgba(await renderReactToSvg(bareElement, { width: 528, fonts: [] }), 528);
  let bareBlack = 0;
  for (let i = 0; i < bareBitmap.rgba.length; i += 4) if (bareBitmap.rgba[i] === 0) bareBlack++;
  expect(bareBlack).toBe(400);
});
