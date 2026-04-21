import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listAllSurfaces, readSurfaceFile, surfacesContentRoot } from "@/lib/surfaceMarkdown";

describe("discovery surface job contracts", () => {
  it("has at least five scenario surfaces", () => {
    const n = listAllSurfaces().filter((s) => s.surfaceKind === "scenario").length;
    expect(n).toBeGreaterThanOrEqual(5);
  });

  it("has at least three comparison surfaces", () => {
    const n = listAllSurfaces().filter((s) => s.surfaceKind === "comparison").length;
    expect(n).toBeGreaterThanOrEqual(3);
  });

  it("first-run verification satisfies requirement 3", () => {
    const p = join(surfacesContentRoot(), "guides", "first-run-verification.md");
    const raw = readFileSync(p, "utf8");
    expect(raw).toContain("npm run first-run-verify");
    expect(raw).toContain("/integrate");
    expect(raw).toContain("/openapi-commercial-v1.yaml");
    const s = readSurfaceFile("guides", "first-run-verification");
    expect(s.primaryCta).toBe("integrate");
    expect(s.guideJob).toBe("implementation");
  });

  it("implementation guide is only first-run-verification", () => {
    const impl = listAllSurfaces().filter((s) => s.guideJob === "implementation");
    expect(impl.map((s) => s.route)).toEqual(["/guides/first-run-verification"]);
  });
});
