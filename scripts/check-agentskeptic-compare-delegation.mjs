/**
 * Enforces compare/regression documentation delegation: agentskeptic.md must not retain
 * legacy Debug compare triple or compare --prior/--current; must link to regression-artifact-normative.md.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const path = join(root, "docs", "agentskeptic.md");
const text = readFileSync(path, "utf8");

let failed = false;
function fail(msg) {
  failed = true;
  console.error(msg);
}

if (text.includes("comparePanelHtml")) {
  fail("docs/agentskeptic.md must not contain legacy substring comparePanelHtml (use regression-artifact-normative.md).");
}

if (text.includes("agentskeptic compare --prior") || text.includes("compare --prior")) {
  fail("docs/agentskeptic.md must not document compare --prior (manifest-only compare).");
}
if (text.includes("--current <path>") && text.includes("compare")) {
  fail("docs/agentskeptic.md must not document compare --current path (manifest-only compare).");
}

const linkOk =
  text.includes("./regression-artifact-normative.md") || text.includes("docs/regression-artifact-normative.md");
if (!linkOk) {
  fail("docs/agentskeptic.md must contain a link to regression-artifact-normative.md (relative ./regression-artifact-normative.md or docs/...).");
}

const i1 = text.indexOf("comparePanelHtml");
const i2 = text.indexOf("humanSummary");
const i3 = text.indexOf("report");
if (i1 !== -1 && i2 !== -1 && i3 !== -1 && i1 < i2 && i2 < i3 && i3 - i1 < 800) {
  fail("docs/agentskeptic.md contains legacy compare API triple (comparePanelHtml … humanSummary … report) in one window.");
}

if (failed) {
  process.exit(1);
}
