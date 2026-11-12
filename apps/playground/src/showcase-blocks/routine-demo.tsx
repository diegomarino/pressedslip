/** @jsxRuntime automatic */
/** @jsxImportSource react */
// Demo block for the pressedslip playground. Uses pressedslip's public
// defineBlock API as a consumer would. Not part of pressedslip's built-in
// catalog. The JSX pragmas let Node scripts (scripts/docs/) render this file
// with the automatic runtime too.
import type { BlockDefinition } from "pressedslip/browser";
import { applyTextStyle, defineBlock, imageBlock } from "pressedslip/browser";
import { type ZodType, z } from "zod";
import { type EmojiName, emojiPng } from "../variants/assets/emoji.js";

type RoutineItem = {
  text: string;
  emoji?: EmojiName | undefined;
  image?: { src: string; alt?: string | undefined } | undefined;
};

const emojiNames = Object.keys(emojiPng) as [EmojiName, ...EmojiName[]];

const routineDemoSchema: ZodType<{ items: RoutineItem[] }> = z.object({
  items: z
    .array(
      z.object({
        text: z.string().min(1),
        emoji: z.enum(emojiNames).optional(),
        image: z.object({ src: z.string(), alt: z.string().optional() }).optional(),
      }),
    )
    .min(1)
    .max(8),
});

export type RoutineDemoData = z.infer<typeof routineDemoSchema>;

/** Printed emoji size: 96 px is ~12 mm at 203 dpi, big enough for pre-readers. */
export const ROUTINE_IMAGE_PX = 96;

/**
 * Demo block — a pre-reader checklist: a tick box, a large picture and a short
 * label per item. Pictures are PNG data URIs (`image.src`) or the name of one
 * of the bundled Noto Emoji (`emoji`, rasterized ahead of time by
 * scripts/docs/generate-emoji-assets.mjs). They are drawn by calling the builtin `imageBlock.render`
 * inside this block, so they get the same validation, resampling and
 * Floyd–Steinberg dithering as a top-level image slot.
 */
export const routineDemoBlock: BlockDefinition<RoutineDemoData> = defineBlock({
  type: "routineDemo",
  schema: routineDemoSchema,
  render: ({ data, ctx }) => {
    const ink = ctx.theme.textStyles.body?.color ?? "#000";
    const textStyle = {
      ...applyTextStyle(ctx.theme.textStyles.display, ctx.fontRoles),
      fontSize: 32,
      lineHeight: 1.1,
    };
    return (
      <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        {data.items.map((item, i) => {
          const src =
            item.image?.src ?? (item.emoji !== undefined ? emojiPng[item.emoji] : undefined);
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static item order
              key={i}
              style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  border: `4px solid ${ink}`,
                  borderRadius: 6,
                }}
              />
              <div
                style={{
                  display: "flex",
                  width: ROUTINE_IMAGE_PX + 16,
                  height: ROUTINE_IMAGE_PX + 16,
                  flexShrink: 0,
                }}
              >
                {src !== undefined &&
                  imageBlock.render({
                    data: {
                      layout: "column",
                      fit: "none",
                      dither: "floyd-steinberg",
                      maxHeight: ROUTINE_IMAGE_PX,
                      images: [{ src, alt: item.image?.alt ?? item.text }],
                    },
                    ctx,
                  })}
              </div>
              <div style={{ display: "flex", flexGrow: 1, flexBasis: 0, ...textStyle }}>
                {item.text}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
  shell: { showTitle: true, separator: "thin", padding: "normal" },
  hints: [
    "Required: `data.items`: 1–8 `{ text, emoji? | image? }`",
    `Tip: \`emoji\` is one of: ${emojiNames.join(", ")}`,
    "Tip: or pass any PNG data URI as `image.src`; light colours are dithered, not lost",
    "Tip: rasterize SVG emoji to PNG first — see docs/guide/recipes.md#emoji",
  ],
});
