/**
 * Ensures docs/commercial-enforce-gate-normative.md validation index paths exist.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const docPath = join(root, "docs", "commercial-enforce-gate-normative.md");

const START = "<!-- commercial-enforce-gate-validation-index:start -->";
const END = "<!-- commercial-enforce-gate-validation-index:end -->";

describe("commercial-enforce-gate normative doc", () => {
  it("every path in Machine-checked validation index exists and is non-empty", () => {
    const text = readFileSync(docPath, "utf8");
    const i0 = text.indexOf(START);
    const i1 = text.indexOf(END);
    assert.ok(i0 !== -1, "missing validation index start marker");
    assert.ok(i1 !== -1 && i1 > i0, "missing validation index end marker");
    const block = text.slice(i0 + START.length, i1);
    const paths = [];
    for (const line of block.split(/\r?\n/)) {
      const m = /^\s*-\s*`([^`]+)`\s*$/.exec(line);
      if (m) paths.push(m[1]);
    }
    assert.ok(paths.length >= 4, "expected at least four indexed paths");
    for (const rel of paths) {
      const normalized = join(root, ...rel.split("/"));
      assert.ok(existsSync(normalized), `missing: ${rel}`);
      assert.ok(readFileSync(normalized, "utf8").length > 0, `empty: ${rel}`);
    }
  });
});
