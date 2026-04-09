import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("TryItSection.tsx", () => {
  const src = readFileSync(
    path.join(__dirname, "..", "src", "app", "home", "TryItSection.tsx"),
    "utf8",
  );

  it("binds data-testid to productCopy uiTestIds for outputs", () => {
    expect(src).toContain("data-testid={productCopy.uiTestIds.tryTruthReport}");
    expect(src).toContain("data-testid={productCopy.uiTestIds.tryWorkflowJson}");
  });
});
