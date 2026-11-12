/** @jsxRuntime automatic */
/** @jsxImportSource react */
// Demo block for the pressedslip playground. Uses pressedslip's public
// defineBlock API as a consumer would. Not part of pressedslip's built-in
// catalog. The JSX pragmas let Node scripts (scripts/docs/) render this file
// with the automatic runtime too.
import type { BlockDefinition } from "pressedslip/browser";
import { applyTextStyle, defineBlock } from "pressedslip/browser";
import { type ZodType, z } from "zod";

const drawingPromptDemoSchema: ZodType<{ prompt: string; height?: number | undefined }> = z.object({
  prompt: z.string().min(1),
  height: z.number().int().min(80).max(800).optional(),
});

export type DrawingPromptDemoData = z.infer<typeof drawingPromptDemoSchema>;

/**
 * Demo block — a prompt plus an empty dashed frame to draw in. Paper is the
 * feature here: the block reserves blank space, which costs nothing to render
 * and survives the 1-bit threshold because the frame is solid ink.
 */
export const drawingPromptDemoBlock: BlockDefinition<DrawingPromptDemoData> = defineBlock({
  type: "drawingPromptDemo",
  schema: drawingPromptDemoSchema,
  render: ({ data, ctx }) => {
    const ink = ctx.theme.textStyles.body?.color ?? "#000";
    return (
      <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={applyTextStyle(ctx.theme.textStyles.body, ctx.fontRoles)}>{data.prompt}</div>
        <div
          style={{
            width: "100%",
            height: data.height ?? 300,
            border: `2px dashed ${ink}`,
            borderRadius: 8,
          }}
        />
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Required: `data.prompt`",
    "Tip: `data.height` (80–800 px) sets the drawing frame; 300 px is ~38 mm at 203 dpi",
  ],
});
