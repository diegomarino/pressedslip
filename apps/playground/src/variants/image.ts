/** @fileoverview Playground image examples using compact builtin fixtures. */
import { imageFixtures } from "pressedslip/testing";
import type { Variant } from "./index.js";

export const imageVariants: Variant[] = [
  {
    id: "image-tux",
    label: "image · Tux (URL)",
    slot: {
      blockType: "image",
      title: "TUX",
      data: {
        layout: "column",
        maxHeight: 256,
        images: [
          {
            src: "https://raw.githubusercontent.com/diegomarino/pressedslip/663028ea9ce813192efec798323b5cadd382fffd/docs/assets/visual-refs/block-image-tux.png",
            alt: "Tux, the Linux mascot",
          },
        ],
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
