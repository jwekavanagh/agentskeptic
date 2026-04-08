/**
 * Adoption golden-path validation (plan WRAPPER_IO, BATCH_*, NO_STEPS_*).
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { loadEventsForWorkflow } from "../dist/loadEvents.js";
import { formatNoStepsForWorkflowMessage } from "../dist/noStepsMessage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cliJs = join(root, "dist", "cli.js");
const demoPath = join(root, "scripts", "demo.mjs");
const seedPath = join(root, "examples", "seed.sql");
const demoDb = join(root, "examples", "demo.db");
const eventsPath = join(root, "examples", "events.ndjson");
const registryPath = join(root, "examples", "tools.json");
const wrongWfFixture = join(root, "test", "fixtures", "adoption-validation", "wrong-workflow-id.events.ndjson");

describe("adoption-validation", () => {
  it("demo_script_has_no_success_path_console_io", () => {
    const src = readFileSync(demoPath, "utf8");
    const forbidden = [
      "console.log",
      "console.info",
      "console.warn",
      "console.debug",
      "process.stdout.write",
      "process.stderr.write",
    ];
    for (const f of forbidden) {
      assert.equal(src.includes(f), false, `forbidden substring: ${f}`);
    }
    assert.equal(src.split("console.error(").length, 2, "exactly one console.error(");
  });

  beforeEach(() => {
    if (existsSync(demoDb)) unlinkSync(demoDb);
    const seedSql = readFileSync(seedPath, "utf8");
    const db = new DatabaseSync(demoDb);
    db.exec(seedSql);
    db.close();
  });

  afterEach(() => {
    if (existsSync(demoDb)) unlinkSync(demoDb);
  });

  it("cli_wf_complete_batch_contract", () => {
    const r = spawnSync(
      process.execPath,
      ["--no-warnings", cliJs, "--workflow-id", "wf_complete", "--events", eventsPath, "--registry", registryPath, "--db", demoDb],
      { encoding: "utf8", cwd: root },
    );
    assert.equal(r.status, 0, r.stderr);
    const line = r.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
    const o = JSON.parse(line);
    assert.equal(o.status, "complete");
    assert.equal(o.steps[0]?.status, "verified");
  });

  it("cli_wf_missing_batch_contract", () => {
    const r = spawnSync(
      process.execPath,
      ["--no-warnings", cliJs, "--workflow-id", "wf_missing", "--events", eventsPath, "--registry", registryPath, "--db", demoDb],
      { encoding: "utf8", cwd: root },
    );
    assert.equal(r.status, 1, r.stderr);
    const line = r.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
    const o = JSON.parse(line);
    assert.equal(o.status, "inconsistent");
    assert.equal(o.steps[0]?.status, "missing");
    assert.equal(o.steps[0]?.reasons[0]?.code, "ROW_ABSENT");
  });

  it("no_steps_message_matches_template_for_wrong_workflow_id_fixture", () => {
    const { eventFileAggregateCounts } = loadEventsForWorkflow(wrongWfFixture, "wf_requested");
    const expectedMsg = formatNoStepsForWorkflowMessage("wf_requested", eventFileAggregateCounts);
    const r = spawnSync(
      process.execPath,
      [
        "--no-warnings",
        cliJs,
        "--workflow-id",
        "wf_requested",
        "--events",
        wrongWfFixture,
        "--registry",
        registryPath,
        "--db",
        demoDb,
      ],
      { encoding: "utf8", cwd: root },
    );
    assert.equal(r.status, 2, r.stderr);
    const line = r.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
    const o = JSON.parse(line);
    const rl = o.runLevelReasons.find((x) => x.code === "NO_STEPS_FOR_WORKFLOW");
    assert(rl, "NO_STEPS_FOR_WORKFLOW present");
    assert.equal(rl.message, expectedMsg);
  });

  it("no_steps_human_stderr_contains_full_message", () => {
    const { eventFileAggregateCounts } = loadEventsForWorkflow(wrongWfFixture, "wf_requested");
    const expectedMsg = formatNoStepsForWorkflowMessage("wf_requested", eventFileAggregateCounts);
    const r = spawnSync(
      process.execPath,
      [
        "--no-warnings",
        cliJs,
        "--workflow-id",
        "wf_requested",
        "--events",
        wrongWfFixture,
        "--registry",
        registryPath,
        "--db",
        demoDb,
      ],
      { encoding: "utf8", cwd: root },
    );
    assert.equal(r.status, 2);
    const stderr = r.stderr.replace(/\r\n/g, "\n");
    assert.equal(stderr.split(expectedMsg).length, 2);
  });
});
