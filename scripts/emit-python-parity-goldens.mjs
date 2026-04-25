#!/usr/bin/env node
/**
 * Emit golden Outcome Certificate JSON for python/tests/parity_vectors/partner_contract_sql.
 * LangGraph LCT rows (A2, B, C, D): use `npm run regen:langgraph-embeds` (single SSOT with website).
 * Run from repo root after `npm run build`.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cli = join(root, "dist", "cli.js");
const partnerDir = join(root, "examples", "partner-quickstart");
const partnerRegistry = join(partnerDir, "partner.tools.json");
const partnerEvents = join(partnerDir, "partner.events.ndjson");
const partnerSeed = readFileSync(join(partnerDir, "partner.seed.sql"), "utf8");

const outRoot = join(root, "python", "tests", "parity_vectors");

function seedDb() {
  const dir = mkdtempSync(join(tmpdir(), "parity-golden-"));
  const dbPath = join(dir, "p.db");
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(partnerSeed);
  } finally {
    db.close();
  }
  return { dbPath, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function main() {
  mkdirSync(join(outRoot, "partner_contract_sql"), { recursive: true });

  const { dbPath, cleanup } = seedDb();
  try {
    const r1 = runCli([
      "--workflow-id",
      "wf_partner",
      "--events",
      partnerEvents,
      "--registry",
      partnerRegistry,
      "--db",
      dbPath,
    ]);
    if (r1.status !== 0) {
      console.error(r1.stderr);
      throw new Error(`contract_sql verify failed: ${r1.status}`);
    }
    const cert1 = JSON.parse(r1.stdout.trim());
    writeFileSync(
      join(outRoot, "partner_contract_sql", "golden_certificate.json"),
      `${JSON.stringify(cert1, null, 2)}\n`,
      "utf8",
    );
  } finally {
    cleanup();
  }

  console.log("Wrote partner_contract_sql golden. For LangGraph LCT rows, run: npm run regen:langgraph-embeds");
}

main();
