import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_PATH_MAX_CODEPOINTS,
  normalizeFunnelSurfaceAttribution,
} from "@/lib/funnelAttribution";

describe("normalizeFunnelSurfaceAttribution", () => {
  it("returns empty object for undefined", () => {
    expect(normalizeFunnelSurfaceAttribution(undefined)).toEqual({});
  });

  it("keeps valid utm and paths", () => {
    expect(
      normalizeFunnelSurfaceAttribution({
        utm_source: " x ",
        landing_path: "/p?q=1",
      }),
    ).toEqual({ utm_source: "x", landing_path: "/p?q=1" });
  });

  it("rejects ://", () => {
    expect(() =>
      normalizeFunnelSurfaceAttribution({ utm_source: "http://evil" }),
    ).toThrow();
  });

  it("rejects landing_path over cap", () => {
    const long = "a".repeat(ATTRIBUTION_PATH_MAX_CODEPOINTS + 1);
    expect(() => normalizeFunnelSurfaceAttribution({ landing_path: long })).toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() => normalizeFunnelSurfaceAttribution({ evil: "x" })).toThrow();
  });
});
