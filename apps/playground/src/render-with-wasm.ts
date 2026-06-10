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
function buildComposition(draft: DraftComposition): CompositionInput {
  return {
    // id/version/status are required identity fields; the diagnostic fields
    // (failedBlocks/providerOutcomes/timing) are optional on CompositionInput
    // and normalized by render(). Only slots/date/subject/meta are consumed.
    id: "playground-draft",
    version: 1,
    date: draft.date,
    status: "ready",
    ...(draft.subject !== undefined ? { subject: draft.subject } : {}),
    slots: draft.slots.map((s, index) => ({
      index,
      blockType: s.blockType,
      data: s.data,
      ...(s.title !== undefined ? { title: s.title } : {}),
    })),
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
  const rendered = await render(buildComposition(draft), {
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
    failedBlocks: rendered.failedBlocks,
  };
}
