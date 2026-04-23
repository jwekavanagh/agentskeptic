import { describe, expect, it } from "vitest";
import {
  getHomeCommercialSectionFromConfig,
  getMeteringClarifier,
  HOME_COMMERCIAL_LEAD,
} from "@/lib/commercialNarrative";

describe("commercial surface contract", () => {
  it("home commercial short lead and strip prefix with the metering clarifier (SSOT link in strip)", () => {
    const s = getHomeCommercialSectionFromConfig();
    expect(s.lead).toBe(HOME_COMMERCIAL_LEAD);
    expect(s.strip.startsWith(getMeteringClarifier())).toBe(true);
  });
});
