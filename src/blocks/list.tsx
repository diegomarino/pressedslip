/**
 * @fileoverview listBlock: unified flat-or-sectioned list. A list is N groups,
 * each with optional title + separator + items. An item is { id?, value }; if
 * id is present, it is rendered before separator + value with typographic
 * emphasis. Items may omit id to render value as plain text.
 */
import { type ZodType, z } from "zod";
import { defineBlock } from "../define-block.js";
import { applyTextStyle } from "../themes/apply-text-style.js";
import type { BlockDefinition } from "../types.js";

// No .default() in this schema — input and output types are identical, so ZodType<Output> is a sound annotation. If you add .default() to any field, ZodType<T> may need to be replaced with ZodType<Output, Input>.
const listSchema: ZodType<{
  groups: {
    title?: string | undefined;
    separator?: string | undefined;
    items: { id?: string | undefined; value: string }[];
  }[];
}> = z.object({
  groups: z
    .array(
      z.object({
        title: z.string().optional(),
        separator: z.string().optional(),
        items: z.array(
          z.object({
            id: z.string().optional(),
            value: z.string(),
          }),
        ),
      }),
    )
    .min(1),
});

/**
 * Data shape accepted by listBlock. `groups.length === 1` covers the
 * flat-list case; `>1` covers sectioned (e.g. onThisDay's events/births/deaths).
 */
export type ListData = z.infer<typeof listSchema>;

/**
 * Built-in unified flat-or-sectioned list block.
 *
 * Renders each group as an optional bold title followed by its items. Each
 * item renders `{id}{group.separator}{value}` when `id` is present, or just
 * `{value}` otherwise. One group = flat list; multiple groups = sectioned list
 * (e.g. onThisDay events / births / deaths).
 *
 * @example
 * ```ts
 * import { listBlock, createRegistry } from "pressedslip";
 *
 * const registry = createRegistry([listBlock]);
 * // slot data: { groups: [{ title: "Events", items: [{ value: "Moon landing" }] }] }
 * ```
 */
export const listBlock: BlockDefinition<ListData> = defineBlock({
  type: "list",
  schema: listSchema,
  render: ({ data, ctx }) => {
    const rowGap = ctx.theme.listItemGap;
    const emphasisStyle = applyTextStyle(ctx.theme.textStyles.emphasis, ctx.fontRoles);
    const bodyStyle = applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles);
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {data.groups.map((group, gi) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: group order is stable per data
          <div key={gi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {group.title !== undefined && (
              // fontWeight:700 = identity intent: group title is always bold
              <div style={{ ...emphasisStyle, fontWeight: 700 }}>{group.title}</div>
            )}
            {group.items.map((item, ii) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: item order is stable per data
              <div key={ii} style={{ ...bodyStyle, display: "flex", flexDirection: "row" }}>
                {item.id !== undefined && (
                  // paddingRight (not flex `gap`) — Satori applies flex gap
                  // unreliably when a sibling's value wraps to a second line:
                  // some rows render with the gap, others fuse. paddingRight is
                  // box-model and survives wrap. Same theme knob (listItemGap),
                  // just a more Satori-stable internal primitive.
                  // flexShrink:0 — pins the id box so Yoga's wrap re-measure
                  // cannot shrink it and consume the paddingRight gap.
                  <div
                    style={{
                      ...emphasisStyle,
                      fontWeight: 700,
                      paddingRight: rowGap,
                      flexShrink: 0,
                    }}
                  >
                    {`${item.id}${group.separator ?? ""}`}
                  </div>
                )}
                <div>{item.value}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Required: `data.groups` (min 1), `data.groups[].items[]`",
    "Tip: Set `id` on items to render as bold prefix",
    "Tip: Set `title` or `separator` on a group for headers",
    "Docs: docs/blocks/list.md",
  ],
});
