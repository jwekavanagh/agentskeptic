import { HOME_SECTION_ORDER } from "@/app/page.sections";
import { describe, expect, it } from "vitest";

describe("HOME_SECTION_ORDER", () => {
  it("matches conversion funnel order (ten sections)", () => {
    expect([...HOME_SECTION_ORDER]).toEqual([
      "hero",
      "homeFailureExample",
      "tryIt",
      "homeWhatCatches",
      "homeStakes",
      "howItWorks",
      "homeWhoFor",
      "homeGuarantees",
      "homeClosing",
      "commercialSurface",
    ]);
    expect(HOME_SECTION_ORDER.length).toBe(10);
  });

  it("orders hero through commercialSurface monotonically", () => {
    const he = HOME_SECTION_ORDER.indexOf("hero");
    const fe = HOME_SECTION_ORDER.indexOf("homeFailureExample");
    const tr = HOME_SECTION_ORDER.indexOf("tryIt");
    const wc = HOME_SECTION_ORDER.indexOf("homeWhatCatches");
    const st = HOME_SECTION_ORDER.indexOf("homeStakes");
    const hw = HOME_SECTION_ORDER.indexOf("howItWorks");
    const w = HOME_SECTION_ORDER.indexOf("homeWhoFor");
    const g = HOME_SECTION_ORDER.indexOf("homeGuarantees");
    const cl = HOME_SECTION_ORDER.indexOf("homeClosing");
    const cs = HOME_SECTION_ORDER.indexOf("commercialSurface");
    expect(he).toBeLessThan(fe);
    expect(fe).toBeLessThan(tr);
    expect(tr).toBeLessThan(wc);
    expect(wc).toBeLessThan(st);
    expect(st).toBeLessThan(hw);
    expect(hw).toBeLessThan(w);
    expect(w).toBeLessThan(g);
    expect(g).toBeLessThan(cl);
    expect(cl).toBeLessThan(cs);
  });

  it("excludes pricing", () => {
    expect(HOME_SECTION_ORDER).not.toContain("pricing");
  });
});
