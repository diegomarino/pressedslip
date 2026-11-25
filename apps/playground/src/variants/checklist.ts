/**
 * @fileoverview Playground variants for checklistBlock.
 */
import type { Variant } from "./index.js";

export const checklistVariants: Variant[] = [
  {
    id: "checklist-before-leaving",
    label: "checklist · before leaving home",
    slot: {
      blockType: "checklist",
      title: "BEFORE LEAVING",
      data: {
        items: ["Keys", "Wallet", "Phone and charger", "Water bottle", "Lock the door"],
      },
    },
  },
  {
    id: "checklist-groceries",
    label: "checklist · short groceries",
    slot: {
      blockType: "checklist",
      title: "GROCERIES",
      data: { items: ["Milk", "Eggs × 12", "Spinach", "Lemons × 4"] },
    },
  },
  {
    id: "checklist-wrap-row",
    label: "checklist · long values (wrap demo)",
    slot: {
      blockType: "checklist",
      title: "THIS WEEKEND",
      data: {
        items: [
          "Call the landlord about the leaking bathroom tap and agree on a day for the plumber to visit",
          "Buy milk",
          "Print the boarding passes and put the passport, travel insurance and hotel confirmation in the blue folder",
        ],
      },
    },
  },
];
