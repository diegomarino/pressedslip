/** @fileoverview Resolve playground image URLs before render without changing editor data. */
import { readFile } from "node:fs/promises";
import { imageFromBuffer, render } from "pressedslip/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderDraft } from "./render-with-wasm.js";
import type { DraftComposition } from "./state/draft-composition.js";
import { imageVariants } from "./variants/image.js";

vi.mock("pressedslip/browser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("pressedslip/browser")>()),
  render: vi.fn(),
}));
const url =
  "https://raw.githubusercontent.com/diegomarino/pressedslip/663028ea9ce813192efec798323b5cadd382fffd/docs/assets/visual-refs/block-image-tux.png";
const png = new Uint8Array(
  await readFile(new URL("../../../docs/assets/visual-refs/block-image-tux.png", import.meta.url)),
);
const draft = (src = url): DraftComposition => ({
  date: "2026-10-02",
  meta: {},
  slots: [
    { blockType: "image", title: "TUX", data: { layout: "column", images: [{ src, alt: "Tux" }] } },
  ],
});
beforeEach(() => {
  vi.mocked(render).mockResolvedValue({
    bytes: Uint8Array.of(0),
    width: 8,
    height: 8,
    format: "png-1bit",
    failedBlocks: [],
    canvasOverflow: null,
  });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("playground URL images", () => {
  it("seeds the existing Tux variant with its pinned editable URL", () => {
    expect(imageVariants[0]?.slot.data).toMatchObject({ images: [{ src: url }] });
  });
  it("resolves image URLs before rendering and leaves the editor draft unchanged", async () => {
    const local = imageFromBuffer(png, "image/png");
    const input = draft();
    (input.slots[0]?.data as { images: { src: string }[] }).images.push({ src: local });
    input.slots.push({ blockType: "textCell", data: { text: url } });
    const original = structuredClone(input);
    let imageLoaded = false;
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      if (input === url) {
        imageLoaded = true;
        return new Response(png);
      }
      return new Response(new Uint8Array());
    });
    vi.stubGlobal("fetch", fetch);
    vi.mocked(render).mockImplementation(async (composition) => {
      expect(imageLoaded).toBe(true);
      expect(composition.slots[0]?.data).toMatchObject({
        images: [{ src: local, alt: "Tux" }, { src: local }],
      });
      expect(composition.slots[1]?.data).toEqual({ text: url });
      return {
        bytes: Uint8Array.of(0),
        width: 8,
        height: 8,
        format: "png-1bit",
        failedBlocks: [],
        canvasOverflow: null,
      };
    });
    expect(await renderDraft(input, "default")).toMatchObject({ src: "blob:preview" });
    expect(input).toEqual(original);
    expect(fetch.mock.calls.filter(([input]) => input === url)).toHaveLength(1);
  });
  it.each([
    "404",
    "CORS",
    "unsupported",
  ])("surfaces %s load errors before calling render", async (failure) => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof globalThis.fetch>(async (input) => {
        if (input !== url) return new Response(new Uint8Array());
        if (failure === "CORS") throw new TypeError("Failed to fetch");
        return new Response("GIF89a", { status: failure === "404" ? 404 : 200 });
      }),
    );
    await expect(renderDraft(draft(), "default")).rejects.toThrow(
      failure === "404"
        ? /HTTP 404/
        : failure === "CORS"
          ? /Failed to fetch/
          : /Convert other formats to PNG/,
    );
    expect(render).not.toHaveBeenCalled();
  });
  it("leaves local sources and malformed image data to existing render validation", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(new Uint8Array()));
    vi.stubGlobal("fetch", fetch);
    const local = imageFromBuffer(png, "image/png");
    const input = draft(local);
    input.slots.push(
      { blockType: "image", data: null },
      { blockType: "image", data: { images: [null, { src: 42 }] } },
    );
    await renderDraft(input, "default");
    expect(vi.mocked(render).mock.calls[0]?.[0].slots.map((slot) => slot.data)).toEqual(
      input.slots.map((slot) => slot.data),
    );
    expect(fetch.mock.calls.some(([input]) => String(input).startsWith("https:"))).toBe(false);
  });
});
