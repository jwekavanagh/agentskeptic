/**
 * ADOPTION_EPISTEMICS_CONTRACT — commercial verdict shape and anchor SSOT links.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ANCHOR_DOCS = [
  "docs/funnel-observability-ssot.md",
  "docs/growth-metrics-ssot.md",
  "docs/commercial-ssot.md",
  "docs/first-run-integration.md",
  "docs/golden-path.md",
  "docs/verification-product-ssot.md",
];

const LINK = "adoption-epistemics-ssot.md";

describe("adoption epistemics contract", () => {
  it("commercial_validation_verdict_layers_shape", () => {
    const raw = readFileSync(join(root, "artifacts", "commercial-validation-verdict.json"), "utf8");
    const v = JSON.parse(raw);
    assert.equal(v.schemaVersion, 1);
    assert.ok(v.layers && typeof v.layers === "object");
    assert.ok("regression" in v.layers);
    assert.ok("playwrightCommercialE2e" in v.layers);
    assert.equal("funnel" in v.layers, false);
    assert.equal(typeof v.layers.regression, "boolean");
    assert.equal(typeof v.layers.playwrightCommercialE2e, "boolean");
  });

  it("anchor_docs_link_adoption_epistemics_ssot", () => {
    for (const rel of ANCHOR_DOCS) {
      const body = readFileSync(join(root, rel), "utf8");
      assert.ok(
        body.includes(LINK),
        `${rel} must link to ${LINK}`,
      );
    }
  });
});
