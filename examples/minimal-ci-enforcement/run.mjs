/**
 * Minimal external-style CI check: seed SQLite, create baseline, then run stateful enforce check.
 * Run from repo root after build: node examples/minimal-ci-enforcement/run.mjs
 */
import { readFileSync, mkdtempSync, rmSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const here = __dirname;
const root = join(__dirname, "..", "..");
const cliJs = join(root, "dist", "cli.js");
const dbDir = mkdtempSync(join(tmpdir(), "minimal-ci-"));
const dbPath = join(dbDir, "app.db");
try {
  const sql = readFileSync(join(here, "seed.sql"), "utf8");
  const db = new DatabaseSync(dbPath);
  db.exec(sql);
  db.close();

  const eventsPath = join(here, "events.ndjson");
  const registryPath = join(here, "tools.json");
  const baseline = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      cliJs,
      "enforce",
      "--workflow-id",
      "wf_complete",
      "--events",
      eventsPath,
      "--registry",
      registryPath,
      "--db",
      dbPath,
      "--no-human-report",
      "--create-baseline",
    ],
    { encoding: "utf8", cwd: root },
  );
  if (baseline.status !== 0) {
    console.error(baseline.stderr || baseline.stdout);
    process.exit(baseline.status ?? 1);
  }

  const check = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      cliJs,
      "enforce",
      "--workflow-id",
      "wf_complete",
      "--events",
      eventsPath,
      "--registry",
      registryPath,
      "--db",
      dbPath,
      "--no-human-report",
    ],
    { encoding: "utf8", cwd: root },
  );
  if (check.status !== 0) {
    console.error(check.stderr || check.stdout);
    process.exit(check.status ?? 1);
  }
} finally {
  rmSync(dbDir, { recursive: true, force: true });
}
