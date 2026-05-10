import * as cheerio from "cheerio";
import { describe, expect, it, beforeAll } from "vitest";
import {
  ensureMarketingSiteRunning,
  getSiteHtml,
  registerMarketingSiteTeardown,
} from "./helpers/siteTestServer";

registerMarketingSiteTeardown();

function integrateMainText(html: string): string {
  const $ = cheerio.load(html);
  const $main = $("main.integrate-main").first();
  $main.find("script, style, noscript").remove();
  return $main.text().replace(/\s+/g, " ").trim();
}

describe("integrate verdict activation (browser-first onboarding)", { timeout: 300_000 }, () => {
  beforeAll(async () => {
    await ensureMarketingSiteRunning();
  });

  it("surfaces truth_check_verdict and a three-verdict table; bans legacy checklist strings", async () => {
    const html = await getSiteHtml("/integrate");
    const text = integrateMainText(html);
    expect(text).toContain("truth_check_verdict");
    expect(text).toContain("trusted");
    expect(text).toContain("not_trusted");
    expect(text).toContain("unknown");

    expect(text).not.toContain("VERDICT: complete");
    expect(text).not.toContain("trust: TRUSTED");

    const $ = cheerio.load(html);
    const $table = $("main.integrate-main table.integrate-verdict-table");
    expect($table.length).toBe(1);
  });
});
