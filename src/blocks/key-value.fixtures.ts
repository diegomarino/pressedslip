/**
 * @fileoverview Sample data scenarios for keyValueBlock.
 */
import type { KeyValueData } from "./key-value.js";

/**
 * Map of scenario name → valid KeyValueData for keyValueBlock.
 *
 * @example
 * import { keyValueFixtures } from "pressedslip/testing";
 * const data = keyValueFixtures.basic;
 */
export const keyValueFixtures: Record<string, KeyValueData> = {
  basic: { label: "Temperature", value: "22°C" },
  longValue: {
    label: "Notes",
    value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  numericLabel: { label: "42", value: "Answer to life, the universe, everything." },
};
