import { describe, expect, it, vi } from "vitest";
import { noopLogger } from "../../src/logger.js";
import { PAPER, resolveDpi, resolveWidth } from "../../src/paper.js";

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

describe("resolveDpi", () => {
  it("uses the explicit dpi on a millimeter-based spec", () => {
    expect(resolveDpi({ mm: 210, dpi: 300 })).toBe(300);
  });

  it("uses a PaperPreset's nativeDpi", () => {
    expect(resolveDpi(PAPER.thermal80)).toBe(203);
    expect(resolveDpi(PAPER.thermal110)).toBe(203);
  });

  it("falls back to 203 for a context-free pixel spec", () => {
    expect(resolveDpi({ px: 576 })).toBe(203);
  });

  it("falls back to 203 for a millimeter spec without dpi", () => {
    expect(resolveDpi({ mm: 80 })).toBe(203);
  });
});
