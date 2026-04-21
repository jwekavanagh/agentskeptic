#!/usr/bin/env node
/**
 * CI guard: legacy integrator verification surfaces must not regress.
 * @see docs/outcome-certificate-normative.md
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "coverage",
  "playwright-report",
  "test-results",
]);

/** `formatWorkflowTruthReport(` only allowed in these repo-relative paths. */
const FORMAT_TRUTH_ALLOW = new Set([
  "src/workflowTruthReport.ts",
  "src/pipeline.ts",
  "src/verificationDiagnostics.test.ts",
]);

function walkFiles(dir, acc) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
}

const allFiles = [];
walkFiles(root, allFiles);

const failures = [];

for (const abs of allFiles) {
  const rel = relative(root, abs).split("\\").join("/");
  if (!rel.endsWith(".ts") && !rel.endsWith(".tsx") && !rel.endsWith(".mjs") && !rel.endsWith(".md")) continue;
  if (rel.startsWith("node_modules/") || rel.startsWith("dist/")) continue;

  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    continue;
  }

  const legacyNoTruth = ["--no", "-truth", "-report"].join("");
  if (text.includes(legacyNoTruth)) {
    failures.push(`${rel}: forbidden legacy CLI flag (use --no-human-report)`);
  }

  if (rel === "docs/outcome-certificate-integrator.md" && /\bWorkflowResult\b/.test(text)) {
    failures.push(`${rel}: integrator doc must not mention WorkflowResult`);
  }

  if (rel.startsWith("src/") && (rel.endsWith(".ts") || rel.endsWith(".tsx")) && !rel.endsWith(".d.ts")) {
    if (FORMAT_TRUTH_ALLOW.has(rel) || FORMAT_TRUTH_ALLOW.has(rel.replace(/\\/g, "/"))) {
      // allowed
    } else if (text.includes("formatWorkflowTruthReport(")) {
      failures.push(`${rel}: formatWorkflowTruthReport( — use outcome certificate formatters or allowlist only engine/pipeline/tests`);
    }
  }

  if (rel === "src/index.ts") {
    /** Exported symbol named WorkflowResult (not *FromWorkflowResult identifiers). */
    if (/(?:^|\n)\s*WorkflowResult\s*[,}]/.test(text)) {
      failures.push(`${rel}: must not export type or value WorkflowResult from package entry`);
    }
  }
}

if (failures.length) {
  console.error("assert-no-legacy-verify-surface: FAILED\n" + failures.join("\n"));
  process.exit(1);
}

console.log("assert-no-legacy-verify-surface: OK");
