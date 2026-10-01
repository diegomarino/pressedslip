/** @fileoverview Builtin column of local PNG/SVG images with proportional sizing and thermal dithering. */
import { z } from "zod";
import { defineBlock } from "../define-block.js";
import type { BlockDefinition } from "../types.js";
import { preparePng } from "./image/raster.js";
import { imageFromBuffer, parseImageSource, validateImageUri } from "./image/source.js";

/** Consumer input for a column of images, with optional sizing and dither defaults. */
export type ImageData = {
  layout: "column";
  fit?: "reduce" | "extend" | "none";
  dither?: "floyd-steinberg" | "none";
  maxHeight?: number;
  images: { src: string; alt?: string; width?: number; height?: number }[];
};
type ResolvedImageData = Omit<ImageData, "fit" | "dither"> & {
  fit: "reduce" | "extend" | "none";
  dither: "floyd-steinberg" | "none";
};
const imageSchema: z.ZodType<ResolvedImageData, ImageData> = z.object({
  layout: z.literal("column"),
  fit: z.enum(["reduce", "extend", "none"]).default("reduce"),
  dither: z.enum(["floyd-steinberg", "none"]).default("floyd-steinberg"),
  maxHeight: z.number().int().positive().optional(),
  images: z
    .array(
      z.object({
        src: z
          .string()
          .refine(
            validateImageUri,
            "Pass a PNG or SVG data URI (maximum 2 MiB); see imageFromBuffer. Convert other formats to PNG.",
          ),
        alt: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      }),
    )
    .min(1)
    .max(12),
});

/** Builtin image column. PNGs are resampled and binarized before Satori; SVGs remain vector images. */
export const imageBlock: BlockDefinition<ResolvedImageData> = defineBlock({
  type: "image",
  schema: imageSchema,
  render: ({ data, ctx }) => {
    const availableWidth = Math.floor(ctx.contentWidth - 16);
    if (!Number.isFinite(availableWidth) || availableWidth < 1)
      throw new Error("image requires positive content width after padding");
    const images = data.images.map((image, index) => {
      try {
        const natural = parseImageSource(image.src, image);
        let scale =
          data.fit === "reduce"
            ? Math.min(1, availableWidth / natural.width)
            : data.fit === "extend"
              ? availableWidth / natural.width
              : 1;
        if (data.maxHeight !== undefined) scale = Math.min(scale, data.maxHeight / natural.height);
        const width = Math.max(1, Math.floor(natural.width * scale));
        const height = Math.max(1, Math.floor(natural.height * scale));
        const oversized = width > availableWidth;
        if (oversized)
          ctx.logger.warn("image wider than content width; cropped on the right", {
            naturalWidth: natural.width,
            availableWidth,
            index,
          });
        const src =
          natural.mime === "image/png"
            ? imageFromBuffer(preparePng(natural.bytes, width, height, data.dither), "image/png")
            : natural.src;
        return (
          <img
            // biome-ignore lint/suspicious/noArrayIndexKey: static image order within synchronous rendering
            key={index}
            src={src}
            width={width}
            height={height}
            alt={image.alt ?? ""}
            style={{
              flexShrink: 0,
              objectFit: "fill",
              alignSelf: oversized ? "flex-start" : "center",
            }}
          />
        );
      } catch (error) {
        throw new Error(
          `image ${index}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    });
    return (
      <div
        style={{
          width: "100%",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {images}
      </div>
    );
  },
  shell: { showTitle: true, padding: "normal" },
  hints: [
    "Required: `data.layout`: column",
    "Required: `data.images`: 1–12 PNG/SVG data URIs",
    "Values of `data.fit`: reduce|extend|none",
    "Values of `data.dither`: floyd-steinberg|none",
    "Docs: docs/blocks/image.md",
  ],
});
