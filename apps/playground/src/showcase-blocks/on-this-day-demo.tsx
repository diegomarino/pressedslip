// Demo block for the pressedslip playground. Uses pressedslip's public
// defineBlock API as a consumer would. Not part of pressedslip's built-in
// catalog.
import type { BlockDefinition, RenderContext } from "pressedslip/browser";
import { applyTextStyle, defineBlock } from "pressedslip/browser";
import type { CSSProperties, ReactElement } from "react";
import { type ZodType, z } from "zod";

const onThisDayDemoSchema: ZodType<{
  events?: string[] | undefined;
  births?: string[] | undefined;
  deaths?: string[] | undefined;
}> = z.object({
  events: z.array(z.string()).optional(),
  births: z.array(z.string()).optional(),
  deaths: z.array(z.string()).optional(),
});

export type OnThisDayDemoData = z.infer<typeof onThisDayDemoSchema>;

function renderSection(
  title: string,
  items: string[] | undefined,
  labelStyle: CSSProperties,
  bodyStyle: CSSProperties,
  bullet: string,
): ReactElement | null {
  if (items === undefined || items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={labelStyle}>{title}</div>
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: position-stable per data
        <div key={i} style={bodyStyle}>{`${bullet} ${item}`}</div>
      ))}
    </div>
  );
}

/**
 * Demo block — adopts the `listItemBullet` theme token so the
 * bullet character tracks the active theme (• in default, - in mono).
 */
export const onThisDayDemoBlock: BlockDefinition<OnThisDayDemoData> = defineBlock({
  type: "onThisDayDemo",
  schema: onThisDayDemoSchema,
  render: ({ data, ctx }: { data: OnThisDayDemoData; ctx: RenderContext }) => {
    const labelStyle = applyTextStyle(ctx.theme.textStyles.label, ctx.fontRoles);
    const bodyStyle = applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles);
    const bullet = ctx.theme.listItemBullet;
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
        {renderSection("Events", data.events, labelStyle, bodyStyle, bullet)}
        {renderSection("Births", data.births, labelStyle, bodyStyle, bullet)}
        {renderSection("Deaths", data.deaths, labelStyle, bodyStyle, bullet)}
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Tip: Any combination of `data.events`, `data.births`, `data.deaths` may be omitted; absent sections are not rendered",
    'Tip: switch theme to "mono" — bullet changes • → -',
  ],
});
