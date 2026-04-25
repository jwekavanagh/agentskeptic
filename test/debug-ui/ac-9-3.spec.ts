import { expect, test } from "@playwright/test";

test("AC_9_3_compare_panel_markup", async ({ page }) => {
  await page.goto("/");
  // Run checkboxes live in the Runs panel; Compare panel hides that table.
  const rowA = page.locator('tr[data-run-id="run_a"]');
  await expect(rowA).toBeVisible();
  await rowA.locator("input.pick").check();
  await page.locator('tr[data-run-id="run_b"] input.pick').check();
  await page.locator('button.tab[data-tab="compare"]').click();
  await page.getByRole("button", { name: "Compare selected" }).click();
  const section = page.locator('[data-etl-section="regression-artifact"]');
  await expect(section).toBeVisible();
  await expect(page.locator("[data-etl-regression-classification]")).toBeVisible();
  await expect(page.locator("[data-etl-regression-headline]")).toBeVisible();
  await expect(page.locator("[data-etl-why-matters]")).toBeVisible();
});
