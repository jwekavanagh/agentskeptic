#!/usr/bin/env node
/**
 * Elimination proof: no authoritative v1 LangGraph product path in example driver, CI core, or generated commands.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runPath = path.join(root, "examples", "langgraph-reference", "run.mjs");
const corePath = path.join(root, "scripts", "lib", "langgraphReferenceVerifyCore.mjs");
const partnerCmdPath = path.join(root, "docs", "partner-quickstart-commands.md");

function fail(msg) {
  console.error("assert-no-langgraph-v1-product-path:", msg);
  process.exit(1);
}

const runSrc = readFileSync(runPath, "utf8");
if (runSrc.includes('"schemaVersion": 1') || runSrc.includes("'schemaVersion': 1")) {
  fail("examples/langgraph-reference/run.mjs must not emit schemaVersion 1");
}

const coreSrc = readFileSync(corePath, "utf8");
if (coreSrc.includes("expected exactly one NDJSON line")) {
  fail("langgraphReferenceVerifyCore.mjs must not retain legacy v1 single-line error text");
}
if (!coreSrc.includes("--langgraph-checkpoint-trust")) {
  fail("langgraphReferenceVerifyCore.mjs must contain --langgraph-checkpoint-trust");
}

const md = readFileSync(partnerCmdPath, "utf8");
const anchor = "## LangGraph reference";
const idx = md.indexOf(anchor);
if (idx === -1) {
  fail("docs/partner-quickstart-commands.md must contain a ## LangGraph reference heading");
}
const rest = md.slice(idx);
const nextHeading = rest.search(/\n## /);
const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
if (!section.includes("--langgraph-checkpoint-trust")) {
  fail("LangGraph section in docs/partner-quickstart-commands.md must include --langgraph-checkpoint-trust");
}

console.log("assert-no-langgraph-v1-product-path: ok");
