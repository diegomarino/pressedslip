import { describe, expect, it } from "vitest";
import { adaptToComposition } from "../../src/_internal/adapters/marplanner-envelope.js";
import { loadFixtures } from "./fixtures-loader.js";
import { resolvePath } from "./resolve-path.js";

const knownBlockTypes = new Set(["text-cell", "kpi", "list", "key-value", "qa-pair", "quotation"]);

const fixtures = await loadFixtures();

describe("replay harness", () => {
  for (const f of fixtures) {
    it(`structural equivalence: ${f.name}`, async () => {
      const comp = await adaptToComposition(f.input, { knownBlockTypes });
      expect(comp.slots).toHaveLength(f.expected.slotCount);
      expect(comp.slots.map((s) => s.blockType)).toEqual(f.expected.slotBlockTypes);
      expect([...comp.failedBlocks.map((fb) => fb.blockType)].sort()).toEqual(
        [...f.expected.failedBlockTypes].sort(),
      );
      expect(comp.status).toBe(f.expected.briefingStatus);
      for (const check of f.expected.contentChecks ?? []) {
        const slot = comp.slots[check.slotIndex];
        expect(slot, `contentCheck slotIndex ${check.slotIndex} out of range`).toBeDefined();
        // biome-ignore lint/style/noNonNullAssertion: just checked via expect().toBeDefined()
        const resolved = String(resolvePath(slot!, check.path));
        expect(
          resolved.includes(check.contains),
          `Block ${check.slotIndex} (type "${slot?.blockType}") path "${check.path}" expected to contain "${check.contains}" but got "${resolved}"`,
        ).toBe(true);
      }
    });
  }
});
