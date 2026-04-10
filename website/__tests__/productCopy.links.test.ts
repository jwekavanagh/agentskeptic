import { productCopy } from "@/content/productCopy";
import { describe, expect, it } from "vitest";

describe("productCopy.links.cliQuickstart", () => {
  it("matches GitHub README try-it anchor", () => {
    expect(productCopy.links.cliQuickstart).toMatch(
      /^https:\/\/github\.com\/[^/]+\/[^/]+#try-it-about-one-minute$/,
    );
  });
});

describe("productCopy machine contract paths", () => {
  it("uses stable relative URLs for OpenAPI and plans", () => {
    expect(productCopy.links.openapiCommercial).toBe("/openapi-commercial-v1.yaml");
    expect(productCopy.links.commercialPlansApi).toBe("/api/v1/commercial/plans");
  });
});
