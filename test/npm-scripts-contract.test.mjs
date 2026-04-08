/**
 * Enforces npm script shape for post-audit single-gate CI (package.json only).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const PINNED_TEST =
  "npm run build && npm run test:vitest && npm run test:node:sqlite && node scripts/demo.mjs && node scripts/record-adoption-verdict.mjs && node scripts/verify-adoption-verdict.mjs";

const PINNED_SQLITE =
  "node --test --test-force-exit test/adoption-docs-boundary.test.mjs test/adoption-validation-registry.test.mjs test/adoption-validation.test.mjs test/assurance-cli.test.mjs test/bundle-signature-cli-write.test.mjs test/bundle-signature-codes-doc.test.mjs test/bundle-signature-fixture.test.mjs test/cli.test.mjs test/docs-contract.test.mjs test/docs-enforce-stream-contract.test.mjs test/docs-golden-path-pointer-only.test.mjs test/docs-quick-enforce-link.test.mjs test/docs-readme-no-registry-flag.test.mjs test/docs-relational-ssot.test.mjs test/docs-remediation-doctrine.test.mjs test/docs-workflow-result-normative-prose.test.mjs test/enforce-cli.test.mjs test/npm-scripts-contract.test.mjs test/pipeline.sqlite.test.mjs test/quick-verify.sqlite.test.mjs test/quickVerifyPostbuildGate.test.mjs test/reconciler.sqlite.test.mjs test/removed-script-names-ban.test.mjs test/stable-failure-consistency.test.mjs test/tools-registry-relational-surface.test.mjs test/withWorkflowVerification.test.mjs test/workflow-result-consumer-contract.test.mjs test/workflow-result-stdout-version.test.mjs test/workflowTruthReport.test.mjs";

const PINNED_CI =
  "npm run build && npm run test:vitest && npm run test:node:sqlite && node examples/minimal-ci-enforcement/run.mjs && node dist/cli.js assurance run --manifest examples/assurance/manifest.json && npm run test:postgres && npx playwright install chromium && npm run test:debug-ui && npm run validate-ttfv";

function countValidateTtfv(s) {
  return (s.match(/validate-ttfv/g) || []).length;
}

describe("npm scripts contract (test / test:ci)", () => {
  it("scripts.test is exactly the six-segment adoption chain", () => {
    assert.equal(pkg.scripts.test, PINNED_TEST);
    assert.equal(pkg.scripts.test.includes("first-run"), false);
  });

  it("scripts.test:node:sqlite matches pinned 29-file list", () => {
    assert.equal(pkg.scripts["test:node:sqlite"], PINNED_SQLITE);
  });

  it("scripts.test:ci matches pinned full CI chain", () => {
    assert.equal(pkg.scripts["test:ci"], PINNED_CI);
  });

  it("scripts.test:ci contains exactly one validate-ttfv token", () => {
    assert.equal(countValidateTtfv(pkg.scripts["test:ci"]), 1);
  });

  it("scripts.test must not reference removed quick-verify-contract or quick-verify-sql-allowlist", () => {
    assert.equal(pkg.scripts.test.includes("quick-verify-contract"), false);
    assert.equal(pkg.scripts.test.includes("quick-verify-sql-allowlist"), false);
  });

  it("scripts.test:ci must not reference removed scripts", () => {
    assert.equal(pkg.scripts["test:ci"].includes("quick-verify-contract"), false);
    assert.equal(pkg.scripts["test:ci"].includes("quick-verify-sql-allowlist"), false);
  });

  it("test:ci must not run first-run", () => {
    assert.equal(pkg.scripts["test:ci"].includes("first-run"), false);
  });
});
