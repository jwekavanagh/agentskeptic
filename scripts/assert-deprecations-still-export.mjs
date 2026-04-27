#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dts = join(process.cwd(), "dist", "index.d.ts");
if (!existsSync(dts)) {
  console.error("dist/index.d.ts missing; run npm run build");
  process.exit(1);
}
const t = readFileSync(dts, "utf8");
const need = [
  "createDecisionGate",
  "verifyAgentskeptic",
  "verifyWorkflow",
  "runQuickVerify",
  "runQuickVerifyToValidatedReport",
  "assertLangGraphCheckpointProductionGate",
  "createLangGraphCheckpointTrustGate",
];
let bad = false;
for (const name of need) {
  if (!t.includes(name)) {
    console.error(`Missing deprecated export surface: ${name}`);
    bad = true;
  }
}
if (bad) process.exit(1);
console.log("assert-deprecations-still-export: ok");
