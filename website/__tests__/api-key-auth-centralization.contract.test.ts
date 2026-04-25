import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTES = [
  "src/app/api/v1/usage/reserve/route.ts",
  "src/app/api/v1/funnel/verify-outcome/route.ts",
] as const;

describe("api key auth centralization", () => {
  it("does not allow route-local raw key verification helpers", () => {
    for (const rel of ROUTES) {
      const abs = join(process.cwd(), rel);
      const text = readFileSync(abs, "utf8");
      expect(text.includes("sha256HexApiKeyLookupFingerprint")).toBe(false);
      expect(text.includes("verifyApiKey(")).toBe(false);
    }
  });
});
