import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lib = require(join(root, "scripts", "discovery-acquisition.lib.cjs"));
const { normalize } = require(join(root, "scripts", "public-product-anchors.cjs"));
const { validateMarketingValue } = require(join(root, "scripts", "validate-marketing.cjs"));

test("discovery JSON validates (marketing + discovery invariants)", () => {
  lib.validateDiscoveryAcquisition(root);
});

test("README discovery fold body matches buildDiscoveryFoldBody", () => {
  const discovery = lib.loadDiscoveryAcquisition(root);
  const anchors = JSON.parse(readFileSync(join(root, "config", "marketing.json"), "utf8"));
  const origin = normalize(anchors.productionCanonicalOrigin);
  const expected = lib.buildDiscoveryFoldBody(discovery, origin);
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const start = "<!-- discovery-acquisition-fold:start -->";
  const end = "<!-- discovery-acquisition-fold:end -->";
  const i0 = readme.indexOf(start);
  const i1 = readme.indexOf(end);
  assert.ok(i0 >= 0 && i1 > i0);
  const inner = readme
    .slice(i0 + start.length, i1)
    .trim()
    .replaceAll("\r\n", "\n");
  assert.equal(inner, expected.trim().replaceAll("\r\n", "\n"));
});

test("README discovery-readme-title matches readmeTitle", () => {
  const discovery = lib.loadDiscoveryAcquisition(root);
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const tStart = "<!-- discovery-readme-title:start -->";
  const tEnd = "<!-- discovery-readme-title:end -->";
  const i0 = readme.indexOf(tStart);
  const i1 = readme.indexOf(tEnd);
  assert.ok(i0 >= 0 && i1 > i0);
  const inner = readme.slice(i0 + tStart.length, i1).trim();
  assert.equal(inner, `# ${discovery.readmeTitle}`);
});

test("invalid visitorProblemAnswer fails validate-marketing (causality)", () => {
  const base = JSON.parse(readFileSync(join(root, "config", "marketing.json"), "utf8"));
  const bad = { ...base, visitorProblemAnswer: `${base.visitorProblemAnswer} causality` };
  assert.throws(() => validateMarketingValue(bad), /causality/);
});

test("shareableTerminalDemo transcript containing markdown fence fails validate-marketing", () => {
  const discovery = lib.loadDiscoveryAcquisition(root);
  const bad = structuredClone(discovery);
  bad.shareableTerminalDemo = {
    title: "Pasteable terminal proof (bundled demo)",
    transcript: `${discovery.shareableTerminalDemo.transcript}\n\`\`\`\n`,
  };
  assert.throws(
    () => validateMarketingValue(bad),
    /transcript must not contain/,
  );
});
