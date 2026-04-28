#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cliJs = join(root, "dist", "cli.js");

function run(args) {
  return spawnSync(process.execPath, ["--no-warnings", cliJs, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

const temp = mkdtempSync(join(tmpdir(), "as-emission-metrics-"));
const dbPath = join(temp, "metrics.db");
try {
  const seed = readFileSync(join(root, "examples", "seed.sql"), "utf8");
  const db = new DatabaseSync(dbPath);
  db.exec(seed);
  db.close();

  const t0 = Date.now();
  const lint = run([
    "emit-lint",
    "--workflow-id",
    "wf_complete",
    "--events",
    join(root, "examples", "events.ndjson"),
  ]);
  const verify = run([
    "--workflow-id",
    "wf_complete",
    "--events",
    join(root, "examples", "events.ndjson"),
    "--registry",
    join(root, "examples", "tools.json"),
    "--db",
    dbPath,
    "--no-human-report",
  ]);
  const elapsed = Math.max(0, Date.now() - t0);

  const firstPassValidVerificationRate = lint.status === 0 && verify.status === 0 ? 1 : 0;
  const malformedEventRate = lint.status === 0 ? 0 : 1;
  const report = {
    schemaVersion: 1,
    time_to_first_trusted_verdict_seconds: Number((elapsed / 1000).toFixed(3)),
    first_pass_valid_verification_rate: firstPassValidVerificationRate,
    malformed_event_rate: malformedEventRate,
    lint_exit: lint.status,
    verify_exit: verify.status,
  };
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (verify.status !== 0) {
    process.exit(1);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
