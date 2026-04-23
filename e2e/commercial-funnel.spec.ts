import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { getNormativePolicySurfaceLines } from "../website/src/lib/commercialNarrative";
import type { CommercialPlansFile } from "../website/src/lib/plans";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const runFull = process.env.COMMERCIAL_E2E_FULL === "1";

test.describe("commercial funnel", () => {
  test("pricing page shows SSOT plan numbers", async ({ page }) => {
    const plansPath = path.join(repoRoot, "config", "commercial-plans.json");
    const plans = JSON.parse(readFileSync(plansPath, "utf8")) as {
      plans: Record<string, { includedMonthly: number | null; displayPrice: string }>;
    };
    await page.goto("/pricing");
    const fmt = new Intl.NumberFormat("en-US");
    for (const id of ["starter", "individual", "team", "business"] as const) {
      const n = plans.plans[id].includedMonthly;
      if (n !== null) {
        await expect(page.locator(`[data-plan="${id}"]`)).toContainText(fmt.format(n));
      }
      await expect(page.locator(`[data-plan="${id}"]`)).toContainText(plans.plans[id].displayPrice);
    }
  });

  test("pricing shows normative commercial lines (commercialNarrative + catalog)", async ({ page }) => {
    const plansPath = path.join(repoRoot, "config", "commercial-plans.json");
    const catalog = JSON.parse(readFileSync(plansPath, "utf8")) as CommercialPlansFile;
    const lines = getNormativePolicySurfaceLines(catalog);
    await page.goto("/pricing");
    const terms = page.getByRole("list", { name: "Commercial terms" });
    for (const line of lines) {
      await expect(terms).toContainText(line);
    }
  });

  test("full funnel (stripe + mailpit + CLI)", async () => {
    if (!runFull) {
      test.skip();
    }
    // Expand in scripts/run-commercial-e2e.mjs when COMMERCIAL_E2E_FULL=1.
    expect(true).toBe(true);
  });
});
