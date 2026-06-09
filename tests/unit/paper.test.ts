import { describe, expect, it, vi } from "vitest";
import { noopLogger } from "../../src/logger.js";
import { PAPER, resolveWidth } from "../../src/paper.js";

describe("PAPER constants", () => {
  it("ships the expected presets", () => {
    expect(PAPER.thermal58.px).toBe(384);
    expect(PAPER.thermal80.px).toBe(576);
    expect(PAPER.thermal110.px).toBe(832);
    expect(PAPER.a4Portrait.mm).toBe(210);
    expect(PAPER.a4Landscape.mm).toBe(297);
    expect(PAPER.letterPortrait.mm).toBe(215.9);
  });

  it("thermal presets carry informational fields", () => {
    expect(PAPER.thermal80.paperWidthMm).toBe(80);
    expect(PAPER.thermal80.edgeMarginPxPerSide).toBe(32);
    expect(PAPER.thermal80.nativeDpi).toBe(203);
  });
});

describe("resolveWidth", () => {
  it("returns px directly when given { px }", () => {
    expect(resolveWidth({ px: 576 }, noopLogger)).toBe(576);
  });

  it("throws when { px } is not divisible by 8", () => {
    expect(() => resolveWidth({ px: 577 }, noopLogger)).toThrow(/divisible by 8/i);
  });

  it("converts mm to px at default 203 DPI when dpi omitted", () => {
    // 80mm * 203 / 25.4 = 639.3... → round up to next multiple of 8 = 640
    expect(resolveWidth({ mm: 80 }, noopLogger)).toBe(640);
  });

  it("respects explicit dpi", () => {
    // 210mm * 300 / 25.4 = 2480.3 → round up to next multiple of 8 = 2488
    expect(resolveWidth({ mm: 210, dpi: 300 }, noopLogger)).toBe(2488);
  });

  it("warns via logger when rounding changes the px value", () => {
    const warn = vi.fn();
    const logger = { ...noopLogger, warn };
    resolveWidth({ mm: 80 }, logger);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/rounded.*multiple of 8/i),
      expect.objectContaining({ requested: expect.any(Number), actual: 640 }),
    );
  });

  it("does NOT warn when the result is already divisible by 8", () => {
    const warn = vi.fn();
    const logger = { ...noopLogger, warn };
    resolveWidth({ px: 576 }, logger);
    expect(warn).not.toHaveBeenCalled();
  });
});
