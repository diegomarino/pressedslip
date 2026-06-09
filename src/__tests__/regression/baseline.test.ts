/**
 * @fileoverview Byte-identical regression test: themes.default must produce
 * the exact same PNG as the pre-refactor baseline fixture.
 *
 * Uses LOCAL Inter fonts from src/__tests__/fixtures/baseline/fonts/
 * (deterministic; no CDN dependency for CI reproducibility).
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  applyHeaderDefaults,
  applyShellDefaults,
  keyValueBlock,
  kpiBlock,
  listBlock,
  loadFontFromBuffer,
  qaPairBlock,
  quotationBlock,
  textCellBlock,
} from "../../index.js";
import { createRegistry } from "../../registry.js";
import { render } from "../../render.js";
import { themes } from "../../themes/index.js";
import type { PreparedTheme } from "../../themes/types.js";

describe("byte-identical baseline regression", () => {
  it("default theme renders byte-identical to the baseline PNG", async () => {
    const composition = JSON.parse(
      await readFile("src/__tests__/fixtures/baseline/baseline.composition.json", "utf8"),
    );
    const baseline = await readFile("src/__tests__/fixtures/baseline/baseline.png");

    const interRegular = await readFile("src/__tests__/fixtures/baseline/fonts/Inter-Regular.ttf");
    const interBold = await readFile("src/__tests__/fixtures/baseline/fonts/Inter-Bold.ttf");
    const localFonts = [
      await loadFontFromBuffer("Inter", new Uint8Array(interRegular), { weight: 400 }),
      await loadFontFromBuffer("Inter", new Uint8Array(interBold), { weight: 700 }),
    ];

    // Build a PreparedTheme with local fonts, but using themes.default's
    // shell/header configuration. This isolates the regression from CDN
    // availability.
    const themeWithLocalFonts: PreparedTheme = {
      _kind: "prepared",
      id: "default-local",
      label: "Default (local fonts)",
      fonts: localFonts,
      fontRoles: {
        body: localFonts,
        display: localFonts.slice(1), // bold weight 700 only (index 1)
      },
      shell: applyShellDefaults(themes.default.shell),
      header: applyHeaderDefaults(themes.default.header),
    };

    const registry = createRegistry([
      keyValueBlock,
      kpiBlock,
      listBlock,
      qaPairBlock,
      quotationBlock,
      textCellBlock,
    ]);

    const result = await render(composition, {
      theme: themeWithLocalFonts,
      registry,
      width: { px: 576 },
    });
    const png = (result as { bytes?: Uint8Array }).bytes ?? (result as unknown as Uint8Array);
    expect(png.length).toBe(baseline.length);
    expect(Buffer.from(png).equals(Buffer.from(baseline))).toBe(true);
  });
});
