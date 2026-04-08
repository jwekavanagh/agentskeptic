/**
 * docs/golden-path.md is pointers only — no fenced code blocks.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("golden-path pointers doc", () => {
  it("no triple-backtick fences", () => {
    const s = readFileSync(join(root, "docs", "golden-path.md"), "utf8");
    assert.equal(/```/.test(s), false);
  });
});
