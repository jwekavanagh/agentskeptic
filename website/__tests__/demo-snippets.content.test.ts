import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const snippetsPath = path.join(
  __dirname,
  "..",
  "src",
  "content",
  "demoExampleSnippets.ts",
);

describe("demoExampleSnippets.ts content", () => {
  const text = readFileSync(snippetsPath, "utf8");

  it("wf_complete contains expected substrings", () => {
    expect(text).toContain('"status": "complete"');
    expect(text).toContain("VERIFIED");
  });

  it("wf_missing contains expected substrings", () => {
    expect(text).toContain('"status": "inconsistent"');
    expect(text).toContain("ROW_ABSENT");
  });

  it("wf_inconsistent contains expected substrings", () => {
    expect(text).toContain('"status": "inconsistent"');
    expect(text).toContain("VALUE_MISMATCH");
  });
});
