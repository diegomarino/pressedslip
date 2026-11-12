/**
 * @fileoverview Presets must render cleanly: every slot names a registered
 * block and its data passes that block's schema, and each preset's draft
 * carries the theme it is listed with.
 */
import { builtinBlocks, createRegistry } from "pressedslip";
import { describe, expect, it } from "vitest";
import { presets } from "./presets.js";
import { showcaseBlocks } from "./showcase-blocks/index.js";

const registry = createRegistry([...builtinBlocks, ...showcaseBlocks]);

describe("presets", () => {
  it("have unique ids", () => {
    expect(new Set(presets.map((p) => p.id)).size).toBe(presets.length);
  });

  for (const preset of presets) {
    it(`${preset.id}: every slot validates against its block schema`, () => {
      expect(preset.draft.slots.length).toBeGreaterThan(0);
      for (const slot of preset.draft.slots) {
        const block = registry.find(slot.blockType);
        expect(block, slot.blockType).toBeDefined();
        const result = block?.schema.safeParse(slot.data);
        expect(result?.success, `${preset.id} · ${slot.blockType}`).toBe(true);
      }
    });

    it(`${preset.id}: draft theme matches the listed theme`, () => {
      expect(preset.draft.meta.playgroundThemeId).toBe(preset.themeId);
    });
  }
});
