import { productCopy } from "@/content/productCopy";
import { describe, expect, it } from "vitest";

describe("productCopy.links.cliQuickstart", () => {
  it("matches GitHub README try-it anchor", () => {
    expect(productCopy.links.cliQuickstart).toMatch(
      /^https:\/\/github\.com\/[^/]+\/[^/]+#try-it-about-one-minute$/,
    );
  });
});
