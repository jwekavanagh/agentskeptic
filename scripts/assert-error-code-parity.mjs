#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const a = readFileSync(join(root, "schemas", "agentskeptic-error-codes.json"));
const b = readFileSync(join(root, "python", "src", "agentskeptic", "agentskeptic_error_codes.json"));
if (!a.equals(b)) {
  console.error("schemas/agentskeptic-error-codes.json and python copy are out of sync; run node scripts/generate-agentskeptic-error-codes.mjs");
  process.exit(1);
}
console.log("assert-error-code-parity: ok (SSOT JSON === python copy)");
