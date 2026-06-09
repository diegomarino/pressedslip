/**
 * @fileoverview Sample data scenarios for listBlock — flat list, list with
 * id/separator, multi-group sectioned (onThisDay-shape).
 */
import type { ListData } from "./list.js";

/**
 * Map of scenario name → valid ListData for listBlock. Scenario keys are NOT covered by
 * semver — they may rename or be added in patch releases.
 *
 * @example
 * import { listFixtures } from "pressedslip/testing";
 * const data = listFixtures.flat;
 */
export const listFixtures: Record<string, ListData> = {
  flat: {
    groups: [{ items: [{ value: "Pagar luz" }, { value: "Llamar a mamá" }] }],
  },
  flatWithIds: {
    groups: [
      {
        separator: "  ",
        items: [
          { id: "B", value: "Pancakes" },
          { id: "L", value: "Caesar salad" },
          { id: "D", value: "Roasted chicken" },
        ],
      },
    ],
  },
  sectionedOnThisDay: {
    groups: [
      {
        title: "EVENTS",
        separator: ": ",
        items: [
          { id: "1969", value: "Moon landing" },
          { id: "1989", value: "Berlin Wall falls" },
          { id: "2001", value: "Wikipedia launches" },
        ],
      },
      {
        title: "BIRTHS",
        separator: ": ",
        items: [{ id: "1985", value: "Some Name" }],
      },
      {
        title: "DEATHS",
        separator: ": ",
        items: [{ id: "2001", value: "Other Name" }],
      },
    ],
  },
  emptyGroup: {
    groups: [
      { title: "EMPTY SECTION", items: [] },
      { title: "POPULATED", items: [{ value: "lonely item" }] },
    ],
  },
};
