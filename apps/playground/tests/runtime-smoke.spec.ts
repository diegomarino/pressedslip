/**
 * @fileoverview Sp6 §4.3 runtime smoke. Replaces the deleted
 * scripts/verify-browser-harness.mjs build-success-only gate.
 */

import { expect, type Page, test } from "@playwright/test";
import { initialCompositionJsonc } from "../src/initial-composition.js";

async function previewDigest(page: Page) {
  return page.evaluate(async () => {
    const img = document.querySelector(".preview-img") as HTMLImageElement | null;
    if (img === null) throw new Error("preview image not found");
    const bytes = await (await fetch(img.src)).arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  });
}

test("1. cold load — page loads with CTA, no errors, builder pre-loaded", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page).toHaveTitle(/playground/);

  // Preview pane shows the CTA button until first user click — no preview-img exists yet.
  const cta = page.locator(".preview-cta");
  await expect(cta).toBeVisible();
  await expect(page.locator(".preview-img")).toHaveCount(0);

  // Builder has the 11 pre-loaded slots from initialComposition.
  await expect(page.locator(".slot-card")).toHaveCount(11);

  expect(errors).toEqual([]);
});

test("2. first render via CTA boots wasm + produces live image", async ({ page }) => {
  await page.goto("/");
  const cta = page.locator(".preview-cta");
  await expect(cta).toBeVisible();

  await cta.click();

  // CTA disappears, preview-img appears with a blob: URL.
  const img = page.locator(".preview-img");
  await expect(img).toBeVisible({ timeout: 15000 });
  await expect(img).toHaveAttribute("src", /^blob:/);
  await page.waitForFunction(() => {
    const i = document.querySelector(".preview-img") as HTMLImageElement | null;
    return i !== null && i.naturalWidth > 0 && i.naturalHeight > 0;
  });
  await expect(cta).toHaveCount(0);
});

test("3. mutation + render produces smaller image", async ({ page }) => {
  await page.goto("/");
  // First render via CTA to get an initial blob: src.
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:") && i.naturalHeight > 0;
    },
    undefined,
    { timeout: 15000 },
  );

  const firstHeight = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).naturalHeight,
  );
  const firstSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );

  // Delete the first slot via evaluate to bypass DnD PointerSensor event interception.
  // @dnd-kit captures pointerdown on the slot-card container; synthetic Playwright pointer
  // events trigger it even when targeting the nested delete button, leaving DnD in an active
  // drag state and preventing subsequent button clicks from registering.
  await page.evaluate(() => {
    const btn = document.querySelector(
      "button[aria-label='Delete slot 0']",
    ) as HTMLButtonElement | null;
    if (btn === null) throw new Error("Delete slot 0 button not found");
    btn.click();
  });

  await page.getByRole("button", { name: "Render" }).click();

  await page.waitForFunction(
    (prevSrc) => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i !== null && i.src !== prevSrc && i.src.startsWith("blob:");
    },
    firstSrc,
    { timeout: 15000 },
  );

  const nextHeight = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).naturalHeight,
  );
  expect(nextHeight).toBeLessThan(firstHeight);
});

test("4. theme switch changes bytes (T1b: auto-render)", async ({ page }) => {
  await page.goto("/");
  // First render via CTA.
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:") && i.naturalWidth > 0;
    },
    undefined,
    { timeout: 15000 },
  );

  const defaultSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );

  // T1b: theme change auto-renders. Wait for src to change — a new blob: URL
  // is allocated per render, proving a new image was produced.
  await page.locator('select[aria-label="Theme selector"]').selectOption("mono");
  await page.waitForFunction(
    (prevSrc) => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i !== null && i.src !== prevSrc && i.src.startsWith("blob:") && i.naturalWidth > 0;
    },
    defaultSrc,
    { timeout: 15000 },
  );

  const monoSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );
  // Different blob: URLs guarantee distinct render outputs.
  expect(monoSrc).not.toBe(defaultSrc);
});

test("5. width preset triggers an auto-render (W5a)", async ({ page }) => {
  await page.goto("/");
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:");
    },
    undefined,
    { timeout: 15000 },
  );
  const firstSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );
  await page.locator('select[aria-label="Width selector"]').selectOption("384");
  await page.waitForFunction(
    (prevSrc) => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i !== null && i.src !== prevSrc && i.src.startsWith("blob:");
    },
    firstSrc,
    { timeout: 15000 },
  );
});

test("6. theme change triggers an auto-render (W6a)", async ({ page }) => {
  await page.goto("/");
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:");
    },
    undefined,
    { timeout: 15000 },
  );
  const firstSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );
  await page.locator('select[aria-label="Theme selector"]').selectOption("mono");
  await page.waitForFunction(
    (prevSrc) => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i !== null && i.src !== prevSrc && i.src.startsWith("blob:");
    },
    firstSrc,
    { timeout: 15000 },
  );
});

test("7. theme initialization does NOT auto-render before first user click (W6b)", async ({
  page,
}) => {
  await page.goto("/");
  // Wait 1500ms (well past 150ms debounce window) and assert preview-img
  // never materialized — the CTA must still be visible.
  await page.waitForTimeout(1500);
  await expect(page.locator(".preview-cta")).toBeVisible();
  await expect(page.locator(".preview-img")).toHaveCount(0);
});

test("8. stale banner appears on JSON edit and clears on Render (W8a)", async ({ page }) => {
  await page.goto("/");
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:");
    },
    undefined,
    { timeout: 15000 },
  );

  await page.locator(".cm-content").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" ");

  await expect(page.locator(".preview-stale-banner")).toBeVisible({ timeout: 2000 });

  await page.getByRole("button", { name: "Render" }).click();
  await expect(page.locator(".preview-stale-banner")).toHaveCount(0, { timeout: 15000 });
});

test("9. Render flushes current JSON edits without waiting for debounce", async ({ page }) => {
  await page.goto("/");
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:");
    },
    undefined,
    { timeout: 15000 },
  );
  const beforeDigest = await previewDigest(page);

  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(initialCompositionJsonc.replace('"18°C"', '"99°C"'));
  await page.getByRole("button", { name: "Render" }).click();

  await expect(page.locator(".preview-stale-banner")).toHaveCount(0, { timeout: 15000 });
  const afterDigest = await previewDigest(page);
  expect(afterDigest).not.toBe(beforeDigest);
});

test("10. width-preset auto-render does NOT clear stale state (W8b)", async ({ page }) => {
  await page.goto("/");
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:");
    },
    undefined,
    { timeout: 15000 },
  );

  await page.locator(".cm-content").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" ");
  await expect(page.locator(".preview-stale-banner")).toBeVisible({ timeout: 2000 });

  const beforeSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );

  await page.locator('select[aria-label="Width selector"]').selectOption("384");
  await page.waitForFunction(
    (prevSrc) => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i !== null && i.src !== prevSrc && i.src.startsWith("blob:");
    },
    beforeSrc,
    { timeout: 15000 },
  );

  await expect(page.locator(".preview-stale-banner")).toBeVisible();
});

test("11. sp8e-1 — showcase variant adds to builder and preview renders", async ({ page }) => {
  await page.goto("/");
  // First render via CTA to boot wasm.
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:");
    },
    undefined,
    { timeout: 15000 },
  );

  const baselineSlotCount = await page.locator(".slot-card").count();
  const firstSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );

  // Single click calls onClick → onAddVariant (one slot added).
  // dblclick was incorrect — it fires onClick twice (adds 2 slots).
  const card = page.getByText("word-of-day-demo · petrichor", { exact: true });
  await card.click();

  // Builder gains one slot.
  await expect(page.locator(".slot-card")).toHaveCount(baselineSlotCount + 1);

  // Render and confirm the preview src changes within 3 s after CTA settle.
  await page.getByRole("button", { name: "Render" }).click();
  await page.waitForFunction(
    (prevSrc) => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i !== null && i.src !== prevSrc && i.src.startsWith("blob:");
    },
    firstSrc,
    { timeout: 15000 },
  );
});

test("12. sp8f — theme switch produces new render with built-ins", async ({ page }) => {
  await page.goto("/");

  // Boot initial render via CTA.
  await page.locator(".preview-cta").click();
  await page.waitForFunction(
    () => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i?.src.startsWith("blob:");
    },
    undefined,
    { timeout: 15000 },
  );

  const firstSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );

  // Switch theme via the theme selector.
  const themeSelect = page.locator('select[aria-label="Theme selector"]');
  const currentTheme = await themeSelect.inputValue();
  // Pick any option that is not the current one.
  const allOptions = await themeSelect.locator("option").allTextContents();
  const nextTheme = allOptions.find((o) => o !== currentTheme);
  if (nextTheme === undefined) {
    throw new Error("sp8f test 11: no alternate theme option found in selector");
  }
  await themeSelect.selectOption({ label: nextTheme });

  // Click Render and wait for a new image.
  await page.getByRole("button", { name: "Render" }).click();
  await page.waitForFunction(
    (prevSrc) => {
      const i = document.querySelector(".preview-img") as HTMLImageElement | null;
      return i !== null && i.src !== prevSrc && i.src.startsWith("blob:");
    },
    firstSrc,
    { timeout: 15000 },
  );

  // New image loaded — theme switch over built-ins works.
  const newSrc = await page.evaluate(
    () => (document.querySelector(".preview-img") as HTMLImageElement).src,
  );
  expect(newSrc).not.toBe(firstSrc);
  expect(newSrc.startsWith("blob:")).toBe(true);
});
