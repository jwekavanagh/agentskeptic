/**
 * Shared extraction of the integrator website snippet from docs/epistemic-contract.md.
 * Used by sync script, structural validator, and website parity tests.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BEGIN = "<!-- epistemic-contract-integrator-snippet:begin -->";
const END = "<!-- epistemic-contract-integrator-snippet:end -->";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @param {string} [repoRoot] */
export function epistemicContractPath(repoRoot) {
  const root = repoRoot ?? join(__dirname, "..", "..");
  return join(root, "docs", "epistemic-contract.md");
}

/**
 * @param {string} body
 * @returns {string}
 */
export function extractIntegratorSnippetFromBody(body) {
  const i0 = body.indexOf(BEGIN);
  const i1 = body.indexOf(END);
  if (i0 === -1 || i1 === -1 || i1 <= i0) {
    throw new Error("epistemic-contract.md: missing integrator snippet fences");
  }
  const inner = body.slice(i0 + BEGIN.length, i1).replace(/^\r?\n/, "").replace(/\r?\n$/, "");
  return inner;
}

/** @param {string} [repoRoot] */
export function readIntegratorSnippet(repoRoot) {
  const p = epistemicContractPath(repoRoot);
  const body = readFileSync(p, "utf8");
  return extractIntegratorSnippetFromBody(body);
}
