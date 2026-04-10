#!/usr/bin/env node
/**
 * Generates docs/commercial-entitlement-matrix.md from config/commercial-entitlement-matrix.v1.json
 * Usage: node scripts/sync-commercial-entitlement-doc.mjs [--check]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const jsonPath = join(root, "config", "commercial-entitlement-matrix.v1.json");
const mdPath = join(root, "docs", "commercial-entitlement-matrix.md");

const check = process.argv.includes("--check");

function renderMarkdown(data) {
  const lines = [
    "# Commercial entitlement matrix (generated)",
    "",
    "Do not edit by hand. Source: `config/commercial-entitlement-matrix.v1.json`.",
    "Regenerate with `node scripts/sync-commercial-entitlement-doc.mjs`.",
    "",
    "| plan | subscriptionStatus | intent | emergencyAllow | expectProceedToQuota | expectedDenyCode |",
    "|------|------------------|--------|----------------|----------------------|------------------|",
  ];
  for (const r of data.rows) {
    lines.push(
      `| ${r.plan} | ${r.subscriptionStatus} | ${r.intent} | ${r.emergencyAllow} | ${r.expectProceedToQuota} | ${r.expectedDenyCode ?? "null"} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

const raw = readFileSync(jsonPath, "utf8");
const data = JSON.parse(raw);
if (data.schemaVersion !== 1 || !Array.isArray(data.rows)) {
  throw new Error("Invalid commercial-entitlement-matrix.v1.json");
}

const md = renderMarkdown(data);

if (check) {
  if (!existsSync(mdPath)) {
    console.error("sync-commercial-entitlement-doc --check: missing", mdPath);
    process.exit(1);
  }
  const existing = readFileSync(mdPath, "utf8");
  if (existing !== md) {
    console.error(
      "docs/commercial-entitlement-matrix.md is stale vs config/commercial-entitlement-matrix.v1.json",
    );
    process.exit(1);
  }
  console.log("sync-commercial-entitlement-doc --check: ok");
} else {
  writeFileSync(mdPath, md, "utf8");
  console.log("wrote docs/commercial-entitlement-matrix.md");
}
