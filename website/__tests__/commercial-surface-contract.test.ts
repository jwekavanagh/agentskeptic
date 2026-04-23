import { describe, expect, it } from "vitest";
import { getHomeCommercialSectionFromConfig, getMeteringClarifier } from "@/lib/commercialNarrative";

describe("commercial surface contract", () => {
  it("home commercial lead is the full metering clarifier from commercialNarrative", () => {
    const s = getHomeCommercialSectionFromConfig();
    expect(s.lead).toBe(getMeteringClarifier());
  });
});
