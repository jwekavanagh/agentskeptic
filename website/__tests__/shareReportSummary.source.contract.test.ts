import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("shareReportSummary.ts source contract", () => {
  it("must not contain humanReport or humanText substrings (summary derivation does not parse audit prose)", () => {
    const abs = join(__dirname, "../src/lib/shareReportSummary.ts");
    const content = readFileSync(abs, "utf8");
    expect(content).not.toMatch(/humanReport/);
    expect(content).not.toMatch(/humanText/);
  });
});
