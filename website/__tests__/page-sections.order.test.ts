import { HOME_SECTION_ORDER } from "@/app/page.sections";
import { describe, expect, it } from "vitest";

describe("HOME_SECTION_ORDER", () => {
  it("matches conversion funnel order (seven sections)", () => {
    expect([...HOME_SECTION_ORDER]).toEqual([
      "hero",
      "homeTrustStrip",
      "tryIt",
      "homeStakes",
      "howItWorks",
      "fitAndLimits",
      "commercialSurface",
    ]);
    expect(HOME_SECTION_ORDER.length).toBe(7);
  });

  it("orders hero through commercialSurface monotonically", () => {
    const he = HOME_SECTION_ORDER.indexOf("hero");
    const ts = HOME_SECTION_ORDER.indexOf("homeTrustStrip");
    const tr = HOME_SECTION_ORDER.indexOf("tryIt");
    const st = HOME_SECTION_ORDER.indexOf("homeStakes");
    const hw = HOME_SECTION_ORDER.indexOf("howItWorks");
    const fl = HOME_SECTION_ORDER.indexOf("fitAndLimits");
    const cs = HOME_SECTION_ORDER.indexOf("commercialSurface");
    expect(he).toBeLessThan(ts);
    expect(ts).toBeLessThan(tr);
    expect(tr).toBeLessThan(st);
    expect(st).toBeLessThan(hw);
    expect(hw).toBeLessThan(fl);
    expect(fl).toBeLessThan(cs);
  });

  it("excludes pricing", () => {
    expect(HOME_SECTION_ORDER).not.toContain("pricing");
  });
});
