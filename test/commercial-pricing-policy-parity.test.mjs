import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readCommercialPricingLines } from "./lib/readCommercialPricingLines.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pricingClientPath = path.join(
  root,
  "website",
  "src",
  "app",
  "pricing",
  "PricingClient.tsx",
);

describe("commercial pricing policy parity", () => {
  it("PricingClient.tsx contains both normative lines from policy", () => {
    const lines = readCommercialPricingLines(root);
    const src = readFileSync(pricingClientPath, "utf8");
    for (const line of lines) {
      assert.ok(
        src.includes(line),
        `PricingClient.tsx must include policy line: ${line.slice(0, 60)}…`,
      );
    }
  });
});
