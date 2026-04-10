import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("integrate activation guide wiring", () => {
  it("page imports FirstRunActivationGuide and guide resolves partner-quickstart-commands", () => {
    const pageSrc = readFileSync(
      path.join(__dirname, "..", "src", "app", "integrate", "page.tsx"),
      "utf8",
    );
    expect(pageSrc).toContain("FirstRunActivationGuide");
    const guideSrc = readFileSync(
      path.join(__dirname, "..", "src", "app", "integrate", "FirstRunActivationGuide.tsx"),
      "utf8",
    );
    expect(guideSrc).toContain("resolvePartnerQuickstartCommandsMd");
    expect(guideSrc).toContain("partner-quickstart-commands.md");
  });
});
