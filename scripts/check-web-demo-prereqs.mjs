#!/usr/bin/env node
/**
 * Fails fast when the web demo cannot run: Node version, node:sqlite, examples fixtures.
 * Exit 0 = prerequisites satisfied; exit 1 = not.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseNodeMajorMinorPatch(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function nodeAtLeast_22_13() {
  const p = parseNodeMajorMinorPatch(process.version);
  if (!p) return false;
  if (p.major > 22) return true;
  if (p.major < 22) return false;
  if (p.minor > 13) return true;
  if (p.minor < 13) return false;
  return p.patch >= 0;
}

function resolveExamplesDir() {
  const candidates = [path.join(process.cwd(), "examples"), path.join(process.cwd(), "..", "examples")];
  for (const dir of candidates) {
    const db = path.join(dir, "demo.db");
    if (existsSync(db)) return dir;
  }
  return null;
}

function fail(msg) {
  console.error(`check-web-demo-prereqs: ${msg}`);
  process.exit(1);
}

if (!nodeAtLeast_22_13()) {
  fail(`Node >= 22.13.0 required for web demo (got ${process.version})`);
}

try {
  await import("node:sqlite");
} catch (e) {
  fail(`node:sqlite not available: ${e instanceof Error ? e.message : e}`);
}

const { DatabaseSync } = await import("node:sqlite");

const examplesDir = resolveExamplesDir();
if (!examplesDir) {
  fail("examples/ not found (expected examples/demo.db from cwd or parent)");
}

const required = ["events.ndjson", "tools.json", "demo.db"];
for (const f of required) {
  const p = path.join(examplesDir, f);
  if (!existsSync(p)) fail(`missing fixture ${p}`);
}

const dbPath = path.join(examplesDir, "demo.db");
let db;
try {
  db = new DatabaseSync(dbPath, { readOnly: true });
} catch (e) {
  fail(`cannot open ${dbPath}: ${e instanceof Error ? e.message : e}`);
}
try {
  db.exec("SELECT 1");
} finally {
  try {
    db.close();
  } catch {
    /* ignore */
  }
}

console.log("check-web-demo-prereqs: ok");
process.exit(0);
