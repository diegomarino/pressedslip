/**
 * @fileoverview Browser render orchestrator. Lazy: wasm boot + font fetch
 * happen ONLY on first render call (delegated to the package's render() which
 * calls loadThemeFonts internally for ThemeTemplate inputs). No local font
 * cache — the package's memoryFontCache handles deduplication across calls.
 *
 * Builds a synthetic Composition envelope from the DraftComposition and
 * calls browser render() directly. NO compose() — that's provider-driven
 * and irrelevant for "render this exact slot data" use cases. See
 * src/browser/render.ts (package) which accepts Composition directly.
 */
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import {
  type CompositionInput,
  createRegistry,
  type ImageData,
  imageBlock,
  imageFromUrl,
  keyValueBlock,
  kpiBlock,
  listBlock,
  qaPairBlock,
  quotationBlock,
  type Rendering,
  render,
  textCellBlock,
  themes,
  wordSearchBlock,
} from "pressedslip/browser";
import { showcaseBlocks } from "./showcase-blocks/index.js";
import type { DraftComposition } from "./state/draft-composition.js";

/** Re-export ThemeId derived from package themes for App.tsx + Toolbar.tsx */
export const themeIds = ["default", "mono", "compact"] as const;
export type ThemeId = (typeof themeIds)[number];

const registry = createRegistry([
  imageBlock,
  keyValueBlock,
  kpiBlock,
  listBlock,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
  wordSearchBlock,
  ...showcaseBlocks,
]);

/** Map a DraftComposition to a renderable CompositionInput envelope. */
async function buildComposition(draft: DraftComposition): Promise<CompositionInput> {
  const failedBlocks: Rendering["failedBlocks"][number][] = [];
  const slots = await Promise.all(
    draft.slots.map(async (s, index) => {
      try {
        const data = s.data as Partial<ImageData> | null;
        let resolved = s.data;
        if (s.blockType === "image" && Array.isArray(data?.images)) {
          // Settle all downloads before render, including siblings of a failed URL.
          const images = await Promise.allSettled(
            data.images.map(async (image, imageIndex) => {
              if (typeof image?.src !== "string" || !/^https?:\/\//i.test(image.src)) return image;
              try {
                return { ...image, src: await imageFromUrl(image.src) };
              } catch (cause) {
                throw new Error(
                  `image ${imageIndex} (${image.src}): ${cause instanceof Error ? cause.message : String(cause)}`,
                  { cause },
                );
              }
            }),
          );
          resolved = {
            ...data,
            images: images.map((image) => {
              if (image.status === "rejected") throw image.reason;
              return image.value;
            }),
          };
        }
        return {
          index,
          blockType: s.blockType,
          data: resolved,
          ...(s.title !== undefined ? { title: s.title } : {}),
        };
      } catch (error) {
        const failed = {
          index,
          blockType: s.blockType,
          reason: {
            name: error instanceof Error ? error.name : "ImageLoadError",
            message: error instanceof Error ? error.message : String(error),
          },
        };
        failedBlocks.push(failed);
        console.error("Image URL loading failed", failed);
        return null;
      }
    }),
  );
  return {
    id: "playground-draft",
    version: 1,
    date: draft.date,
    status:
      failedBlocks.length === 0
        ? "ready"
        : slots.some((slot) => slot !== null)
          ? "partial"
          : "failed",
    ...(draft.subject !== undefined ? { subject: draft.subject } : {}),
    slots: slots.filter((slot) => slot !== null),
    failedBlocks: failedBlocks.sort((a, b) => a.index - b.index),
    meta: draft.meta,
  };
}

export type RenderResult = {
  src: string;
  width: number;
  height: number;
  failedBlocks: Rendering["failedBlocks"];
};

export async function renderDraft(
  draft: DraftComposition,
  themeId: ThemeId,
  options?: { width?: number },
): Promise<RenderResult> {
  const composition = await buildComposition(draft);
  const rendered = await render(composition, {
    logger: console,
    registry,
    theme: themes[themeId],
    wasm: fetch(wasmUrl),
    ...(options?.width !== undefined ? { width: { px: options.width } } : {}),
  });

  const blob = new Blob([rendered.bytes as BlobPart], { type: "image/png" });
  return {
    src: URL.createObjectURL(blob),
    width: rendered.width,
    height: rendered.height,
    failedBlocks: [...(composition.failedBlocks ?? []), ...rendered.failedBlocks].sort(
      (a, b) => a.index - b.index,
    ),
  };
}
