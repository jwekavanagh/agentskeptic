#!/usr/bin/env node
/**
 * Buyer/guide copy guard: contract Outcome Certificate must not be described as schemaVersion 2.
 * Scan roots (fixed):
 * - All .md files under website/content/surfaces/guides/
 * - website/__tests__/fixtures/guide-migration-goldens.json
 *
 * --self-test: validate detectors only (no repo scan).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** Certificate named first, then version 2 within window. */
const RE_FORWARD = /Outcome Certificate[\s\S]{0,240}schemaVersion\s*[: ]?\s*2\b/im;
/** Version 2 named first, then Outcome Certificate within window. */
const RE_BACKWARD = /\bschemaVersion\s*[: ]?\s*2\b[\s\S]{0,240}Outcome Certificate/im;

/** Legacy exact phrase from historical drift (always reject if present). */
const LEGACY_SUBSTRING = "(contract stdout, schemaVersion 2)";

/**
 * @param {string} body
 * @returns {string | null} reason or null if ok
 */
function violationReasonForBody(body) {
  if (body.includes(LEGACY_SUBSTRING)) {
    return `forbidden legacy substring: ${LEGACY_SUBSTRING}`;
  }
  if (RE_FORWARD.test(body)) {
    RE_FORWARD.lastIndex = 0;
    return `matches ${RE_FORWARD}`;
  }
  if (RE_BACKWARD.test(body)) {
    RE_BACKWARD.lastIndex = 0;
    return `matches ${RE_BACKWARD}`;
  }
  return null;
}

function walkMarkdownFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walkMarkdownFiles(p));
    } else if (ent.isFile() && ent.name.endsWith(".md")) {
      out.push(p);
    }
  }
  return out;
}

function collectScanTargets() {
  const guidesDir = join(root, "website", "content", "surfaces", "guides");
  if (!existsSync(guidesDir)) {
    throw new Error(`[outcome-certificate-buyer-copy] missing guides dir: ${guidesDir}`);
  }
  const md = walkMarkdownFiles(guidesDir);
  const golden = join(root, "website", "__tests__", "fixtures", "guide-migration-goldens.json");
  return [...md.map((abs) => ({ abs, label: abs.slice(root.length + 1).replace(/\\/g, "/") })), { abs: golden, label: "website/__tests__/fixtures/guide-migration-goldens.json" }];
}

function runSelfTest() {
  const badForward = "Contract Outcome Certificate JSON is schemaVersion 2 on the inner certificate.";
  const badBackward = "archive the Outcome Certificate JSON (contract stdout, schemaVersion 2) and";
  const good =
    "Contract stdout is Outcome Certificate v3 (schemaVersion: 3, failureSpine, evidenceCompleteness).";

  const r1 = violationReasonForBody(badForward);
  const r2 = violationReasonForBody(badBackward);
  const r3 = violationReasonForBody(good);

  if (r1 === null) {
    console.error("[outcome-certificate-buyer-copy:self-test] expected violation for badForward");
    process.exit(1);
  }
  if (r2 === null) {
    console.error("[outcome-certificate-buyer-copy:self-test] expected violation for badBackward (legacy substring)");
    process.exit(1);
  }
  if (r3 !== null) {
    console.error(`[outcome-certificate-buyer-copy:self-test] expected good to pass, got: ${r3}`);
    process.exit(1);
  }

  console.log("outcome-certificate-buyer-copy-self-test-ok");
  process.exit(0);
}

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  let failed = false;
  for (const { abs, label } of collectScanTargets()) {
    let text;
    try {
      text = readFileSync(abs, "utf8");
    } catch (e) {
      console.error(`[outcome-certificate-buyer-copy] unreadable ${label}`, e);
      process.exit(1);
    }
    const reason = violationReasonForBody(text);
    if (reason !== null) {
      console.error(`[outcome-certificate-buyer-copy] ${label}: ${reason}`);
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }
  console.log("outcome-certificate-buyer-copy-ok");
}

main();
