/**
 * @fileoverview Unit tests for routineDemoBlock — tick box + label per item,
 * with PNG pictures rendered through the builtin imageBlock.
 */
import type { RenderContext } from "pressedslip";
import { SHELL_DEFAULTS } from "pressedslip";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emojiPng } from "../../variants/assets/emoji.js";
import { ROUTINE_IMAGE_PX, routineDemoBlock } from "../routine-demo.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

function makeCtx(blockType: string): RenderContext {
  return {
    block: { index: 0, blockType, data: {}, title: "T" },
    composition: {
      id: "test",
      version: 1,
      date: "2026-05-31",
      status: "ready",
      slots: [],
      failedBlocks: [],
      providerOutcomes: {},
      timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    },
    logger: { info: noop, warn: noop, error: noop },
    theme: {
      ...SHELL_DEFAULTS,
      textStyles: { ...SHELL_DEFAULTS.textStyles, body: { fontSize: 16, color: "#111" } },
    },
    fontRoles: {},
    contentWidth: 544,
  } as unknown as RenderContext;
}

describe("routineDemoBlock", () => {
  it("renders a tick box and label per item, images via imageBlock", () => {
    const data = routineDemoBlock.schema.parse({
      items: [{ text: "Snack", image: { src: emojiPng.apple, alt: "🍎" } }, { text: "Read" }],
    });
    const element = routineDemoBlock.render({ data, ctx: makeCtx("routineDemo") });
    // biome-ignore lint/style/noNonNullAssertion: render always returns an element
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("Snack");
    expect(html).toContain("Read");
    expect(html.match(/border:4px solid #111/g) ?? []).toHaveLength(2);
    const imgs = html.match(/<img[^>]*>/g) ?? [];
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toContain(`height="${ROUTINE_IMAGE_PX}"`);
    expect(imgs[0]).toContain('alt="🍎"');
  });

  it("resolves bundled emoji names to the same PNGs", () => {
    const data = routineDemoBlock.schema.parse({ items: [{ text: "Snack", emoji: "apple" }] });
    const element = routineDemoBlock.render({ data, ctx: makeCtx("routineDemo") });
    // biome-ignore lint/style/noNonNullAssertion: render always returns an element
    const html = renderToStaticMarkup(element!);
    expect(html.match(/<img[^>]*>/g) ?? []).toHaveLength(1);
    expect(html).toContain('alt="Snack"');
  });

  it("rejects unknown emoji names", () => {
    expect(
      routineDemoBlock.schema.safeParse({ items: [{ text: "x", emoji: "dragon" }] }).success,
    ).toBe(false);
  });

  it("rejects an empty checklist", () => {
    expect(routineDemoBlock.schema.safeParse({ items: [] }).success).toBe(false);
  });
});
