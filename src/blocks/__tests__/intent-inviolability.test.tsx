/**
 * @fileoverview Intent-inviolability tests.
 *
 * Verifies that block-local intent properties spread AFTER the TextStyle slot,
 * so theme overrides cannot attenuate identity-defining block properties.
 * Each test sets a theme that would suppress the intent if order were reversed.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SHELL_DEFAULTS } from "../../themes/apply-defaults.js";
import type { TextStyles } from "../../themes/types.js";
import type { RenderContext } from "../../types.js";
import { keyValueBlock } from "../key-value.js";
import { kpiBlock } from "../kpi.js";
import { listBlock } from "../list.js";
import { quotationBlock } from "../quotation.js";

/* biome-ignore lint/suspicious/noEmptyBlockStatements: test stub */
const noop = () => {};

function makeCtx(textStyleOverrides: Partial<TextStyles> = {}): RenderContext {
  return {
    block: { type: "test", id: "test-0", data: {} },
    composition: {
      id: "test",
      version: 1,
      date: "2026-06-07",
      status: "ready",
      slots: [],
      failedBlocks: [],
      providerOutcomes: {},
      timing: { totalMs: 0, fetchPhaseMs: 0, renderPhaseMs: 0 },
    },
    logger: { debug: noop, info: noop, warn: noop, error: noop },
    theme: {
      ...SHELL_DEFAULTS,
      textStyles: { ...SHELL_DEFAULTS.textStyles, ...textStyleOverrides },
    },
    fontRoles: {},
  } as unknown as RenderContext;
}

describe("intent-inviolability", () => {
  it("kpi.value remains fontWeight:700 when theme sets display.fontWeight:400", () => {
    const ctx = makeCtx({ display: { fontSize: 36, fontWeight: 400 } });
    const element = kpiBlock.render({ data: { value: "42" }, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked by caller
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("font-weight:700");
  });

  it("kpi.label remains text-transform:uppercase when theme sets label.textTransform:none", () => {
    const ctx = makeCtx({ label: { fontSize: 14, textTransform: "none" } });
    const element = kpiBlock.render({ data: { value: "42", label: "REVENUE" }, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked by caller
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("text-transform:uppercase");
  });

  it("keyValue.label remains fontWeight:700 when theme sets label.fontWeight:400", () => {
    const ctx = makeCtx({ label: { fontSize: 14, fontWeight: 400 } });
    const element = keyValueBlock.render({ data: { label: "Status", value: "OK" }, ctx });
    // biome-ignore lint/style/noNonNullAssertion: null checked by caller
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("font-weight:700");
  });

  it("list.group.title remains fontWeight:700 when theme sets emphasis.fontWeight:400", () => {
    const ctx = makeCtx({ emphasis: { fontWeight: 400 } });
    const element = listBlock.render({
      data: { groups: [{ title: "Events", items: [{ value: "Moon landing" }] }] },
      ctx,
    });
    // biome-ignore lint/style/noNonNullAssertion: null checked by caller
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("font-weight:700");
  });

  it("list.item.id remains fontWeight:700 when theme sets emphasis.fontWeight:400", () => {
    const ctx = makeCtx({ emphasis: { fontWeight: 400 } });
    const element = listBlock.render({
      data: { groups: [{ separator: " ", items: [{ id: "08:30", value: "Standup" }] }] },
      ctx,
    });
    // biome-ignore lint/style/noNonNullAssertion: null checked by caller
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("font-weight:700");
  });

  it("quotation.text remains font-style:italic when theme sets emphasis.fontStyle:normal", () => {
    const ctx = makeCtx({ emphasis: { fontStyle: "normal" } });
    const element = quotationBlock.render({
      data: { text: "Make it right.", attribution: "Beck" },
      ctx,
    });
    // biome-ignore lint/style/noNonNullAssertion: null checked by caller
    const html = renderToStaticMarkup(element!);
    expect(html).toContain("font-style:italic");
  });
});
