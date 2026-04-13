/**
 * Fail if SARIF from CodeQL analyze contains results for targeted rule IDs.
 * Usage: node scripts/assert-codeql-remediation-sarif.mjs <sarif-output-dir>
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const TARGET_RULE_IDS = new Set([
  "js/incomplete-url-substring-sanitization",
  "js/double-escaping",
  "js/insufficient-password-hash",
  "js/stack-trace-exposure",
]);

/** @param {string} id @param {Set<string>} targets */
function matchesTargetRuleId(id, targets) {
  if (targets.has(id)) return true;
  for (const t of targets) {
    if (id === t || id.endsWith(`/${t}`) || id.endsWith(`:${t}`)) return true;
  }
  return false;
}

/** @param {string} dir @param {string[]} acc */
function collectSarifFiles(dir, acc) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      collectSarifFiles(p, acc);
    } else if (ent.isFile() && ent.name.endsWith(".sarif")) {
      acc.push(p);
    }
  }
}

const root = process.argv[2];
if (!root) {
  console.error("missing sarif-output directory");
  process.exit(2);
}
try {
  if (!statSync(root).isDirectory()) {
    console.error("missing sarif-output directory");
    process.exit(2);
  }
} catch {
  console.error("missing sarif-output directory");
  process.exit(2);
}

const sarifPaths = [];
collectSarifFiles(root, sarifPaths);
if (sarifPaths.length === 0) {
  console.error("no .sarif files under sarif-output");
  process.exit(3);
}

for (const file of sarifPaths) {
  const sarif = JSON.parse(readFileSync(file, "utf8"));
  const runs = Array.isArray(sarif.runs) ? sarif.runs : [];
  for (const run of runs) {
    const rules = run.tool?.driver?.rules ?? [];
    const results = Array.isArray(run.results) ? run.results : [];
    for (const result of results) {
      let id = result.ruleId;
      if (
        !id &&
        Number.isInteger(result.ruleIndex) &&
        rules[result.ruleIndex]?.id
      ) {
        id = rules[result.ruleIndex].id;
      }
      if (id && matchesTargetRuleId(id, TARGET_RULE_IDS)) {
        console.error(
          `SARIF_VIOLATION ruleId=${id} file=${basename(file)}`,
        );
        process.exit(1);
      }
    }
  }
}

process.exit(0);
