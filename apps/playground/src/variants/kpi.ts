/**
 * @fileoverview Playground variants for kpiBlock.
 */
import type { Variant } from "./index.js";

export const kpiVariants: Variant[] = [
  {
    id: "kpi-weather",
    label: "kpi · weather (value + label + caption)",
    slot: {
      blockType: "kpi",
      title: "WEATHER",
      data: {
        value: "18°C",
        label: "BARCELONA",
        caption: "Partly cloudy · low 13°C · Mon 24 May",
      },
    },
  },
  {
    id: "kpi-focus-streak",
    label: "kpi · focus streak (value + label + caption)",
    slot: {
      blockType: "kpi",
      title: "HABIT",
      data: {
        value: "Day 31",
        label: "DEEP WORK STREAK",
        caption: "Personal best: 47 days",
      },
    },
  },
  {
    id: "kpi-mrr",
    label: "kpi · monthly revenue (finance wildcard)",
    slot: {
      blockType: "kpi",
      title: "FINANCE",
      data: {
        value: "€42,810",
        label: "MRR",
        caption: "+8.3% vs Apr 2026",
      },
    },
  },
];
