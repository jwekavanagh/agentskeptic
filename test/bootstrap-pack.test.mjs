/**
 * Bootstrap pack CLI: golden path + failure modes (docs/bootstrap-pack-normative.md)
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const seedSql = readFileSync(join(root, "examples", "seed.sql"), "utf8");
const cliJs = join(root, "dist", "cli.js");
const inputJson = join(root, "test", "fixtures", "bootstrap-pack", "input.json");
const inputEmptyTools = join(root, "test", "fixtures", "bootstrap-pack", "input-empty-tool-calls.json");
const inputBadArgs = join(root, "test", "fixtures", "bootstrap-pack", "input-bad-arguments.json");

describe("bootstrap pack CLI", () => {
  let tmp;
  let dbPath;

  before(() => {
    tmp = mkdtempSync(join(tmpdir(), "bootstrap-pack-"));
    dbPath = join(tmp, "test.db");
    const db = new DatabaseSync(dbPath);
    db.exec(seedSql);
    db.close();
  });

  it("exits 0 with envelope stdout and empty stderr; pack files exist", () => {
    const outDir = join(tmp, "pack-out");
    const r = spawnSync(
      process.execPath,
      [cliJs, "bootstrap", "--input", inputJson, "--db", dbPath, "--out", outDir],
      { encoding: "utf8", cwd: root, maxBuffer: 10_000_000 },
    );
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.equal(r.stderr, "");
    const env = JSON.parse(r.stdout.trim());
    assert.equal(env.kind, "agentskeptic_bootstrap_result");
    assert.equal(env.verifyStatus, "complete");
    assert.equal(env.quickVerdict, "pass");
    assert.equal(env.workflowId, "wf_bootstrap_fixture");
    assert.ok(typeof env.exportedToolCount === "number" && env.exportedToolCount >= 1);
    assert.ok(existsSync(join(outDir, "events.ndjson")));
    assert.ok(existsSync(join(outDir, "tools.json")));
    assert.ok(existsSync(join(outDir, "quick-report.json")));
    assert.ok(existsSync(join(outDir, "README.bootstrap.md")));
    const qr = JSON.parse(readFileSync(join(outDir, "quick-report.json"), "utf8"));
    assert.equal(qr.productTruth.quickVerifyProvisional, true);
  });

  it("exits 3 when --out already exists", () => {
    const outDir = join(tmp, "pack-out-exists");
    mkdirSync(outDir, { recursive: true });
    const r = spawnSync(
      process.execPath,
      [cliJs, "bootstrap", "--input", inputJson, "--db", dbPath, "--out", outDir],
      { encoding: "utf8", cwd: root, maxBuffer: 10_000_000 },
    );
    assert.equal(r.status, 3);
    assert.equal(r.stdout, "");
    assert.ok(r.stderr.includes("BOOTSTRAP_OUT_EXISTS"));
  });

  it("exits 3 on empty tool_calls", () => {
    const outDir = join(tmp, "pack-empty");
    const r = spawnSync(
      process.execPath,
      [cliJs, "bootstrap", "--input", inputEmptyTools, "--db", dbPath, "--out", outDir],
      { encoding: "utf8", cwd: root, maxBuffer: 10_000_000 },
    );
    assert.equal(r.status, 3);
    assert.equal(r.stdout, "");
    assert.ok(r.stderr.includes("BOOTSTRAP_NO_TOOL_CALLS"));
    assert.ok(!existsSync(outDir));
  });

  it("exits 3 on invalid function.arguments JSON", () => {
    const outDir = join(tmp, "pack-badargs");
    const r = spawnSync(
      process.execPath,
      [cliJs, "bootstrap", "--input", inputBadArgs, "--db", dbPath, "--out", outDir],
      { encoding: "utf8", cwd: root, maxBuffer: 10_000_000 },
    );
    assert.equal(r.status, 3);
    assert.equal(r.stdout, "");
    assert.ok(r.stderr.includes("BOOTSTRAP_TOOL_CALL_ARGUMENTS_INVALID"));
    assert.ok(!existsSync(outDir));
  });
});
