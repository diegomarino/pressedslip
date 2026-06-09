/**
 * @fileoverview Sample data scenarios for kpiBlock.
 */
import type { KpiData } from "./kpi.js";

/**
 * Map of scenario name → valid KpiData for kpiBlock.
 *
 * @example
 * import { kpiFixtures } from "pressedslip/testing";
 * const data = kpiFixtures.full;
 */
export const kpiFixtures: Record<string, KpiData> = {
  valueOnly: { value: "1,234" },
  withLabel: { value: "22°C", label: "Temperature" },
  full: { value: "Day 47", label: "Streak", caption: "Longest: 89 days" },
  captionOnly: { value: "99%", caption: "7-day avg" },
};
