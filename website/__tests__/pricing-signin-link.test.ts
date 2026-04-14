import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PricingClient sign-in CTA href", () => {
  const src = readFileSync(
    path.join(__dirname, "..", "src", "app", "pricing", "PricingClient.tsx"),
    "utf8",
  );

  it("uses callbackUrl to /pricing", () => {
    expect(src).toContain('const PRICING_SIGNIN_HREF = "/auth/signin?callbackUrl=%2Fpricing"');
    expect(src).toContain("href={PRICING_SIGNIN_HREF}");
  });

  it("uses enterpriseMailto prop for enterprise CTA", () => {
    expect(src).toContain("enterpriseMailto");
    expect(src).toContain("href={enterpriseMailto}");
  });
});
