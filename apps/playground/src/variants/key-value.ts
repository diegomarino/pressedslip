/**
 * @fileoverview Playground variants for keyValueBlock.
 */
import type { Variant } from "./index.js";

export const keyValueVariants: Variant[] = [
  {
    id: "key-value-sunrise",
    label: "key-value · sunrise & sunset times",
    slot: {
      blockType: "keyValue",
      title: "DAYLIGHT",
      data: { label: "Sunrise · Sunset", value: "06:22 · 21:04" },
    },
  },
  {
    id: "key-value-location",
    label: "key-value · current location",
    slot: {
      blockType: "keyValue",
      title: "LOCATION",
      data: { label: "City", value: "Barcelona, ES · UTC+2" },
    },
  },
  {
    id: "key-value-server-stat",
    label: "key-value · server memory usage (ops wildcard)",
    slot: {
      blockType: "keyValue",
      title: "INFRA",
      data: { label: "api-prod-03 · RAM", value: "6.1 GB / 8 GB (76%)" },
    },
  },
];
