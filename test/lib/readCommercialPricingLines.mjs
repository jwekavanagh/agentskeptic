import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BEGIN = "<!-- commercial-pricing-lines-begin -->";
const END = "<!-- commercial-pricing-lines-end -->";

/**
 * @param {string} [repoRoot] - Monorepo root (default: two levels up from this file).
 * @returns {[string, string]}
 */
export function readCommercialPricingLines(
  repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."),
) {
  const policyPath = path.join(repoRoot, "docs", "commercial-entitlement-policy.md");
  const t = readFileSync(policyPath, "utf8");
  const i = t.indexOf(BEGIN);
  const j = t.indexOf(END);
  if (i === -1 || j === -1 || j <= i) {
    throw new Error(
      `readCommercialPricingLines: missing delimiters in ${policyPath}`,
    );
  }
  const block = t.slice(i + BEGIN.length, j).trim();
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length !== 2) {
    throw new Error(
      `readCommercialPricingLines: expected exactly 2 non-empty lines, got ${lines.length}`,
    );
  }
  return /** @type {[string, string]} */ (lines);
}
