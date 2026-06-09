/**
 * @fileoverview Playground variants for listBlock.
 */
import type { Variant } from "./index.js";

export const listVariants: Variant[] = [
  {
    id: "list-morning-todos",
    label: "list · morning focus tasks (numbered)",
    slot: {
      blockType: "list",
      title: "TODAY",
      data: {
        groups: [
          {
            separator: ". ",
            items: [
              { id: "1", value: "Review overnight PRs before standup" },
              { id: "2", value: "Standup with Lisbon team at 09:30" },
              { id: "3", value: "Write spec for the publishing milestone" },
              { id: "4", value: "Block 14:00–16:00 for deep work" },
              { id: "5", value: "Gym — upper body session" },
            ],
          },
        ],
      },
    },
  },
  {
    id: "list-calendar-events",
    label: "list · calendar events (sectioned, with times)",
    slot: {
      blockType: "list",
      title: "CALENDAR",
      data: {
        groups: [
          {
            title: "MORNING",
            items: [
              { id: "09:00", value: "Weekly sync · Design × Eng" },
              { id: "10:30", value: "1-on-1 with Mariana Costa" },
            ],
          },
          {
            title: "AFTERNOON",
            items: [
              { id: "14:00", value: "Deep work block — do not disturb" },
              { id: "16:45", value: "Product demo · Acme Corp" },
              { id: "18:00", value: "Retrospective (optional)" },
            ],
          },
        ],
      },
    },
  },
  {
    id: "list-grocery",
    label: "list · grocery run (sectioned by aisle)",
    slot: {
      blockType: "list",
      title: "SHOPPING",
      data: {
        groups: [
          {
            title: "PRODUCE",
            items: [
              { value: "Spinach (200 g)" },
              { value: "Cherry tomatoes" },
              { value: "2 avocados" },
              { value: "Lemons × 4" },
            ],
          },
          {
            title: "DAIRY & COLD",
            items: [
              { value: "Greek yogurt (500 g)" },
              { value: "Eggs × 12" },
              { value: "Manchego wedge" },
            ],
          },
        ],
      },
    },
  },
  {
    id: "list-wrap-row",
    label: "list · long values (wrap demo)",
    slot: {
      blockType: "list",
      title: "TODAY",
      data: {
        groups: [
          {
            items: [
              {
                id: "09:00",
                value:
                  "Standup with Lisbon team — discuss release blockers and Q3 roadmap alignment",
              },
              {
                id: "10:30",
                value:
                  "1:1 with new hire — onboarding feedback and goals for the upcoming sprint cycle",
              },
              {
                id: "14:00",
                value: "Deep work block — finalize ADR-0027 review and prepare publish gate",
              },
            ],
          },
        ],
      },
    },
  },
];
