/**
 * @fileoverview Block registry: maps block types to their definitions, with uniqueness enforcement and O(1) lookup.
 */
import type { AnyBlockDefinition, BlockDefinition, Registry } from "./types.js";

/**
 * Build a Registry from a readonly array of block definitions.
 *
 * Enforces type-key uniqueness — throws on duplicate `type` values. The
 * resulting object has O(1) lookup via an internal `Map`; the `list()` result
 * is frozen to prevent mutation. Accepts mutable arrays too — `readonly` here
 * is a minimum constraint (no mutation required), not a demand for immutability.
 *
 * @param definitions - Block definitions to register; each must have a unique `type`.
 * @returns A frozen `Registry` with `find`, `has`, `list`, and `size`.
 * @example
 * ```ts
 * import { createRegistry, builtinBlocks, defineBlock } from "pressedslip";
 * import { z } from "zod";
 *
 * const customBlock = defineBlock({
 *   type: "weather",
 *   schema: z.object({ temp: z.number() }),
 *   render: ({ data }) => <div>{data.temp}°C</div>,
 * });
 * const registry = createRegistry([...builtinBlocks, customBlock]);
 * ```
 */
export function createRegistry(definitions: readonly AnyBlockDefinition[]): Registry {
  const map = new Map<string, BlockDefinition>();
  for (const def of definitions) {
    if (map.has(def.type)) {
      throw new Error(`Duplicate block type in registry: ${def.type}`);
    }
    map.set(def.type, def);
  }
  const frozenList: ReadonlyArray<BlockDefinition> = Object.freeze([...map.values()]);
  return {
    list: () => frozenList,
    find: (type) => map.get(type),
    has: (type) => map.has(type),
    get size() {
      return map.size;
    },
  };
}
