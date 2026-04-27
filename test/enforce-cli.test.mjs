import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "child_process";
import { DatabaseSync } from "node:sqlite";
import { workflowResultToCiLockV1, stableStringify } from "../dist/ciLock.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cliJs = join(root, "dist", "cli.js");
const eventsPath = join(root, "examples", "events.ndjson");
const registryPath = join(root, "examples", "tools.json");
describe("enforce CLI", () => {
  let dir;
  let dbPath;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "etl-enforce-"));
    dbPath = join(dir, "demo.db");
    const sql = readFileSync(join(root, "examples", "seed.sql"), "utf8");
    const db = new DatabaseSync(dbPath);
    db.exec(sql);
    db.close();
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("batch verify rejects removed --output-lock flag", () => {
    const r = spawnSync(
      process.execPath,
      [
        "--no-warnings",
        cliJs,
        "--workflow-id",
        "wf_complete",
        "--events",
        eventsPath,
        "--registry",
        registryPath,
        "--db",
        dbPath,
        "--no-human-report",
        "--output-lock",
        join(dir, "reject.json"),
      ],
      { encoding: "utf8", cwd: root },
    );
    assert.equal(r.status, 3);
    const err = JSON.parse(r.stderr.trim());
    assert.equal(err.code, "ENFORCE_USAGE");
  });

  it("quick verify rejects removed --expect-lock flag", () => {
    const r = spawnSync(
      process.execPath,
      [
        "--no-warnings",
        cliJs,
        "quick",
        "--input",
        join(root, "test", "fixtures", "quick-verify", "pass-line.ndjson"),
        "--export-registry",
        join(dir, "quick-registry.json"),
        "--db",
        dbPath,
        "--expect-lock",
        join(root, "test", "fixtures", "ci-enforcement", "wf_complete.ci-lock-v1.json"),
      ],
      { encoding: "utf8", cwd: root },
    );
    assert.equal(r.status, 3);
    const err = JSON.parse(r.stderr.trim());
    assert.equal(err.code, "ENFORCE_USAGE");
  });
});

describe("ciLock projection mutation", () => {
  it("workflowResultToCiLockV1 changes when status flipped", () => {
    const stdoutPath = join(root, "examples", "debug-corpus", "run_ok", "workflow-result.json");
    const wr = JSON.parse(readFileSync(stdoutPath, "utf8"));
    const a = workflowResultToCiLockV1(wr);
    const b = workflowResultToCiLockV1({ ...wr, status: "inconsistent" });
    assert.notEqual(stableStringify(a), stableStringify(b));
  });
});
