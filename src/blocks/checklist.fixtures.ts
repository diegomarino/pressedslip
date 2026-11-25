/**
 * @fileoverview Sample data scenarios for checklistBlock — short list, long
 * wrapping items, single item.
 */
import type { ChecklistData } from "./checklist.js";

/**
 * Map of scenario name → valid ChecklistData for checklistBlock. Scenario keys
 * are NOT covered by semver — they may rename or be added in patch releases.
 *
 * @example
 * import { checklistFixtures } from "pressedslip/testing";
 * const data = checklistFixtures.short;
 */
export const checklistFixtures: Record<string, ChecklistData> = {
  short: { items: ["Keys", "Wallet", "Phone", "Water bottle"] },
  longWrapping: {
    items: [
      "Call the landlord about the leaking tap in the bathroom and agree on a day for the plumber to visit",
      "Buy milk",
      "Print the boarding passes and put the passport, travel insurance and hotel confirmation in the blue folder",
    ],
  },
  single: { items: ["Take out the trash"] },
};
