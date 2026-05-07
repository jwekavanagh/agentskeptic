/**
 * Acquisition transcript must stay on Outcome Certificate v3 idioms — ban legacy nested workflow artifact schema v15 blobs.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("marketing discovery transcript", () => {
  it("shareable_terminal_demo_must_not_carry_schemaVersion15_workflow_artifact_example", () => {
    const j = JSON.parse(readFileSync(join(root, "config", "marketing.json"), "utf8"));
    const transcript = String(j.shareableTerminalDemo?.transcript ?? "");
    assert.equal(
      transcript.includes('"schemaVersion": 15'),
      false,
      "replace legacy workflow-result-style schemaVersion 15 with Outcome Certificate v3 narrative",
    );
  });

  it("discovery_readme_fold_must_not_carry_schemaVersion15_after_emit_alignment", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    const start = "<!-- discovery-acquisition-fold:start -->";
    const end = "<!-- discovery-acquisition-fold:end -->";
    const i0 = readme.indexOf(start);
    const i1 = readme.indexOf(end);
    if (i0 < 0 || i1 <= i0) assert.fail("discovery acquisition fold markers missing");
    const fold = readme.slice(i0 + start.length, i1);
    assert.equal(
      fold.includes('"schemaVersion": 15'),
      false,
      "README acquisition fold regenerated from honest certificate-v3 transcript — no stale v15 snippet",
    );
  });
});
