/** @fileoverview Playground image examples using compact builtin fixtures. */
import { imageFixtures } from "pressedslip/testing";
import { tuxPng } from "./assets/tux.js";
import type { Variant } from "./index.js";

export const imageVariants: Variant[] = [
  {
    id: "image-tux",
    label: "image · Tux (dithered PNG)",
    slot: {
      blockType: "image",
      title: "TUX",
      data: {
        layout: "column",
        maxHeight: 256,
        images: [{ src: tuxPng, alt: "Tux, the Linux mascot" }],
      },
    },
  },
  {
    id: "image-logo",
    label: "image · logo and stripes",
    slot: { blockType: "image", title: "IMAGES", data: imageFixtures.basic },
  },
  {
    id: "image-gradient",
    label: "image · dithered gradient",
    slot: { blockType: "image", title: "GRADIENT", data: imageFixtures.gradient },
  },
];
