/** @jsxRuntime automatic */
/** @jsxImportSource react */
/**
 * Pattern: a checklist with big emoji pictures, for kids who can't read yet.
 * Adapted from marplanner's reminders block (MIT).
 *
 * Fonts have no emoji, so emoji are printed as images:
 *  1. At data time, fetch the emoji SVG (Noto Emoji, Apache-2.0) and rasterize
 *     it to a PNG on white with @resvg/resvg-js (already a pressedslip dependency).
 *  2. In the block, call the builtin `imageBlock.render`, which dithers the
 *     PNG so light colours become grey stipple instead of vanishing at 1 bit.
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { type BlockDefinition, defineBlock, imageBlock, imageFromBuffer } from "pressedslip";
import { type ZodType, z } from "zod";

const ICON_PX = 96; // ~12 mm at 203 dpi
/** Pin a release: the default branch no longer has the svg/ folder. */
const NOTO_TAG = "v2.051";

/** Load resvg through pressedslip, so the project doesn't need it as a direct dependency. */
const fromProject = createRequire(join(process.cwd(), "noop.js"));
const { Resvg } = createRequire(fromProject.resolve("pressedslip"))("@resvg/resvg-js");

/** PNG data URI for an emoji, `size` px wide. Cache the result if you print often. */
export async function emojiPng(emoji: string, size = ICON_PX): Promise<string> {
  const hex = [...emoji]
    .map((c) => c.codePointAt(0) ?? 0)
    .filter((cp) => cp !== 0xfe0f)
    .map((cp) => cp.toString(16))
    .join("_");
  const url = `https://raw.githubusercontent.com/googlefonts/noto-emoji/${NOTO_TAG}/svg/emoji_u${hex}.svg`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`no Noto SVG for ${emoji} (${res.status})`);
  const png = new Resvg(await res.text(), {
    fitTo: { mode: "width", value: size },
    background: "#ffffff", // transparent pixels would threshold unpredictably
  })
    .render()
    .asPng();
  return imageFromBuffer(png, "image/png");
}

type ChecklistData = { items: { text: string; image?: string | undefined }[] };

const schema: ZodType<ChecklistData> = z.object({
  items: z
    .array(z.object({ text: z.string().min(1), image: z.string().optional() }))
    .min(1)
    .max(8),
});

export const checklistBlock: BlockDefinition<ChecklistData> = defineBlock({
  type: "checklist",
  schema,
  render: ({ data, ctx }) => (
    <div style={{ width: "100%", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {data.items.map((item) => (
        <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              border: "4px solid #000",
              borderRadius: 6,
            }}
          />
          {item.image && (
            <div
              style={{ display: "flex", width: ICON_PX + 16, height: ICON_PX + 16, flexShrink: 0 }}
            >
              {imageBlock.render({
                // Our schema is the one that ran, so pass the builtin fully resolved data.
                data: {
                  layout: "column",
                  fit: "none",
                  dither: "floyd-steinberg",
                  maxHeight: ICON_PX,
                  images: [{ src: item.image, alt: item.text }],
                },
                ctx,
              })}
            </div>
          )}
          <div style={{ display: "flex", flexGrow: 1, flexBasis: 0, minWidth: 0, fontSize: 32 }}>
            {item.text}
          </div>
        </div>
      ))}
    </div>
  ),
  shell: { showTitle: true, separator: "thin", padding: "normal" },
});

export const blocks = [checklistBlock];

export async function exampleSlots() {
  const todo: [string, string][] = [
    ["Brush teeth", "🪥"],
    ["Get dressed", "👕"],
    ["Pack your bag", "🎒"],
  ];
  const items = await Promise.all(
    todo.map(async ([text, emoji]) => ({ text, image: await emojiPng(emoji) })),
  );
  return [{ blockType: "checklist", title: "MORNING", data: { items } }];
}
