/**
 * Discovery-surface pointer parity: llms.txt, AGENTS.md, and README must
 * surface the same canonical Verification Contract Manifest URL.
 *
 * They must NOT cross-link directly to the contract member schemas
 * (event.schema.json, tools-registry.schema.json, tools-registry-export.schema.json).
 * Member identity belongs to the manifest only.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const manifest = JSON.parse(readFileSync(join(root, "schemas", "contract", "v1.json"), "utf8"));
const url = manifest.publicUrl;

const readmeBody = readFileSync(join(root, "README.md"), "utf8");
const llmsBody = readFileSync(join(root, "llms.txt"), "utf8");
const agentsBody = readFileSync(join(root, "AGENTS.md"), "utf8");

test("llms.txt contains the manifest canonical URL", () => {
  assert.ok(llmsBody.includes(url), `llms.txt is missing ${url}`);
});

test("AGENTS.md contains the manifest canonical URL", () => {
  assert.ok(agentsBody.includes(url), `AGENTS.md is missing ${url}`);
});

test("README.md contains the manifest canonical URL", () => {
  assert.ok(readmeBody.includes(url), `README.md is missing ${url}`);
});

test("discovery surfaces do not cross-link directly to contract member schemas", () => {
  const memberFiles = [
    "schemas/event.schema.json",
    "schemas/tools-registry.schema.json",
    "schemas/tools-registry-export.schema.json",
  ];
  for (const surface of [
    { path: "llms.txt", body: llmsBody },
    { path: "AGENTS.md", body: agentsBody },
  ]) {
    for (const m of memberFiles) {
      assert.equal(
        surface.body.includes(m),
        false,
        `${surface.path} must not cross-link directly to ${m}; link to ${url} instead`,
      );
    }
  }
  // README is allowed to mention `schemas/` in code examples, but not as a
  // contract-identity cross-link in the public-product-anchors block.
  const PA_START = "<!-- public-product-anchors:start -->";
  const PA_END = "<!-- public-product-anchors:end -->";
  const i = readmeBody.indexOf(PA_START);
  const j = readmeBody.indexOf(PA_END);
  assert.ok(i >= 0 && j > i, "README public-product-anchors markers must exist");
  const block = readmeBody.slice(i, j + PA_END.length);
  for (const m of memberFiles) {
    assert.equal(
      block.includes(m),
      false,
      `README public-product-anchors block must not cross-link directly to ${m}`,
    );
  }
});
