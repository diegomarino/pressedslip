/**
 * @fileoverview Typed factory that narrows a BlockDefinitionSpec into a BlockDefinition while preserving the TData generic.
 */
import type { BlockDefinition, BlockDefinitionSpec } from "./types.js";

/**
 * Create a typed block definition from a spec literal.
 *
 * Identity cast that narrows a `BlockDefinitionSpec` into a `BlockDefinition`,
 * preserving the `TData` generic for downstream type inference in consumers.
 *
 * @param spec - Block specification: type key, Zod schema, render function, and shell options.
 * @returns A fully-typed `BlockDefinition<TData>` ready for registration.
 * @example
 * ```ts
 * import { defineBlock } from "pressedslip";
 * import { z } from "zod";
 *
 * const greetingBlock = defineBlock({
 *   type: "greeting",
 *   schema: z.object({ name: z.string() }),
 *   render: ({ data }) => <div>Hello, {data.name}!</div>,
 * });
 * ```
 */
export function defineBlock<TData>(spec: BlockDefinitionSpec<TData>): BlockDefinition<TData> {
  return spec;
}
