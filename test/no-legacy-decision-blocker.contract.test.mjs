import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "src");

function listSourceUtf8(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("no legacy formatDecisionBlockerForHumans", () => {
  it("grep surface: export and symbol removed from decision surface", () => {
    const index = readFileSync(join(__dirname, "..", "src", "index.ts"), "utf8");
    expect(index).not.toContain("formatDecisionBlockerForHumans");
  });

  it("implementation removed from decisionBlocker module", () => {
    expect(listSourceUtf8("decisionBlocker.ts")).not.toContain("formatDecisionBlockerForHumans");
  });
});
