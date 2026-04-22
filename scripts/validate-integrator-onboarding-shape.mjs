#!/usr/bin/env node
/**
 * Drift gate: `/integrate` is pack-led only (config/marketing.json); no legacy activation blocks.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function fail(msg) {
  console.error(`validate-integrator-onboarding-shape: ${msg}`);
  process.exit(1);
}

const pc = readFileSync(join(root, "website", "src", "content", "productCopy.ts"), "utf8");
if (/\brunCaption\b/.test(pc) || /\brunHeading\b/.test(pc)) {
  fail("productCopy.ts must not define runCaption or runHeading");
}
if (/\bintegrateActivation\b/.test(pc)) {
  fail("productCopy.ts must not export integrateActivation (use config/marketing.json for /integrate)");
}

const firstRun = readFileSync(join(root, "docs", "first-run-integration.md"), "utf8");
const bannedFirstRun = [
  "## Bootstrap and verify on your sources",
  "Then run contract verification on **your** paths",
  "```bash\nagentskeptic verify-integrator-owned",
];
for (const b of bannedFirstRun) {
  if (firstRun.includes(b)) fail(`first-run-integration.md contains banned fragment: ${JSON.stringify(b)}`);
}

const page = readFileSync(join(root, "website", "src", "app", "integrate", "page.tsx"), "utf8");
if (!page.includes("marketing.integratePage")) {
  fail("integrate/page.tsx must read pack-led copy from marketing.integratePage");
}
if (!page.includes("packLedCommand")) fail("integrate/page.tsx must render packLedCommand");
if (!page.includes("<pre")) fail("integrate/page.tsx must contain a <pre> for the pack-led command");
if (page.includes("IntegrateActivationBlock") || page.includes("IntegrateCrossingCommands")) {
  fail("integrate/page.tsx must not import legacy IntegrateActivationBlock / IntegrateCrossingCommands");
}
if (page.includes("<details")) {
  fail("integrate/page.tsx must not use <details> (normative copy is on GitHub)");
}

console.log("validate-integrator-onboarding-shape: ok");
