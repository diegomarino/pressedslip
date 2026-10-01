/** @fileoverview Compact image column fixtures for public tests, dev rendering, and playground examples. */
import { encode } from "fast-png";
import { imageFromBuffer } from "./image/source.js";
import type { ImageData } from "./image.js";

const logo = imageFromBuffer(
  new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="48"><rect x="2" y="2" width="76" height="44" fill="none" stroke="black" stroke-width="4"/><circle cx="40" cy="24" r="14"/></svg>',
  ),
  "image/svg+xml",
);
const pixels = new Uint8Array(32 * 16);
for (let y = 0; y < 16; y++)
  for (let x = 0; x < 32; x++) pixels[y * 32 + x] = (x + y) % 8 < 4 ? 0 : 255;
const png = imageFromBuffer(
  encode({ width: 32, height: 16, channels: 1, data: pixels }),
  "image/png",
);
const gradient = new Uint8Array(128 * 32);
for (let y = 0; y < 32; y++)
  for (let x = 0; x < 128; x++) gradient[y * 128 + x] = Math.round((x * 255) / 127);
const alpha = imageFromBuffer(
  encode({
    width: 4,
    height: 1,
    channels: 4,
    data: Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 255, 255, 0, 0, 255),
  }),
  "image/png",
);
const ramp = imageFromBuffer(
  encode({ width: 128, height: 32, channels: 1, data: gradient }),
  "image/png",
);

/** Small reviewed examples covering defaults, sizing modes, SVG hints, and tonal processing. */
export const imageFixtures: Record<string, ImageData> = {
  basic: {
    layout: "column",
    images: [
      { src: logo, alt: "Outlined logo" },
      { src: png, alt: "Black and white stripes" },
    ],
  },
  extend: { layout: "column", fit: "extend", images: [{ src: logo }] },
  none: { layout: "column", fit: "none", dither: "none", images: [{ src: png }] },
  gradient: {
    layout: "column",
    fit: "extend",
    maxHeight: 96,
    images: [{ src: ramp, alt: "Dithered grayscale ramp" }],
  },
  alpha: { layout: "column", images: [{ src: alpha }], dither: "none" },
  threshold: { layout: "column", dither: "none", images: [{ src: ramp }] },
  svgHints: {
    layout: "column",
    images: [
      {
        src:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="40" height="24"/></svg>',
          ),
        width: 40,
        height: 24,
      },
    ],
  },
};
