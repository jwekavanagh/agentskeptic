import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoRoot } from "./helpers/distributionGraphHelpers";
import { countJsonStringWords } from "./helpers/countMarketingJsonWords";
import marketing from "@/lib/marketing";

const BASELINE_PROSE = Number.parseInt(
  readFileSync(
    join(getRepoRoot(), "website", "__tests__", "fixtures", "marketing-wordcount-baseline.txt"),
    "utf8",
  ).trim(),
  10,
);

function proseWords() {
  return countJsonStringWords(
    JSON.parse(readFileSync(join(getRepoRoot(), "config", "marketing.json"), "utf8")),
    { omitTranscript: true },
  );
}

describe("marketing.json budget (70% cut vs pre-cutover prose, transcript excluded)", () => {
  it("omits shareable terminal transcript from prose budget and stays under 30% of baseline", () => {
    const current = proseWords();
    const cap = Math.floor(BASELINE_PROSE * 0.3);
    expect(current).toBeLessThanOrEqual(cap);
  });

  it("hero outcome is at most 20 words", () => {
    const n = marketing.heroOutcome.trim().split(/\s+/).filter(Boolean).length;
    expect(n).toBeLessThanOrEqual(20);
  });
});
