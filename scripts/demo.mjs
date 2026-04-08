#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const seedPath = join(root, "examples", "seed.sql");
const eventsPath = join(root, "examples", "events.ndjson");
const registryPath = join(root, "examples", "tools.json");
const dbPath = join(root, "examples", "demo.db");
const cli = join(root, "dist", "cli.js");

const seedSql = readFileSync(seedPath, "utf8");
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
}
const db = new DatabaseSync(dbPath);
db.exec(seedSql);
db.close();

function runCli(workflowId) {
  const r = spawnSync(
    process.execPath,
    [cli, "--workflow-id", workflowId, "--events", eventsPath, "--registry", registryPath, "--db", dbPath],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  return r.status ?? 1;
}

let st = runCli("wf_complete");
let err = null;
if (st !== 0) err = `demo: wf_complete expected exit 0, got ${st}`;
else {
  st = runCli("wf_missing");
  if (st !== 1) err = `demo: wf_missing expected exit 1, got ${st}`;
}
if (err) {
  console.error(err);
  process.exit(1);
}
process.exit(0);
