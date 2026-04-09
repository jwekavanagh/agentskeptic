import { HOME_SECTION_ORDER } from "@/app/page.sections";
import { describe, expect, it } from "vitest";

describe("HOME_SECTION_ORDER", () => {
  it("matches conversion funnel order", () => {
    expect([...HOME_SECTION_ORDER]).toEqual([
      "hero",
      "scenario",
      "mechanism",
      "qualification",
      "guarantees",
      "example",
      "tryIt",
      "nextSteps",
    ]);
  });

  it("places tryIt before nextSteps and example before tryIt", () => {
    const ex = HOME_SECTION_ORDER.indexOf("example");
    const tr = HOME_SECTION_ORDER.indexOf("tryIt");
    const nx = HOME_SECTION_ORDER.indexOf("nextSteps");
    expect(ex).toBeLessThan(tr);
    expect(tr).toBeLessThan(nx);
  });

  it("excludes pricing", () => {
    expect(HOME_SECTION_ORDER).not.toContain("pricing");
  });
});
