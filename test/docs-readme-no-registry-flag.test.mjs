/**
 * README must not document --registry; exactly one fenced code block (install/start).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("README scope (adoption)", () => {
  it("no --registry substring; single fenced block", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    assert.equal(readme.includes("--registry"), false);
    const fenceLines = readme.split(/\r?\n/).filter((line) => /^\s*```/.test(line));
    assert.equal(fenceLines.length, 2, "expected exactly one opening and one closing fence line");
  });
});
