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

/** First `truth_check_verdict` line (telemetry status lines may precede it on stderr). */
function truthVerdictLine(stderr) {
  const lines = String(stderr ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((x) => x.trim());
  const hit = lines.find((l) => /^truth_check_verdict: (trusted|not_trusted|unknown)$/.test(l));
  return hit ?? null;
}

/** Canonical first-run path matches `agentskeptic check`. */
function argvCheck(workflowId) {
  return [
    "--no-warnings",
    cliJs,
    "check",
    "--workflow-id",
    workflowId,
    "--events",
    eventsPath,
    "--registry",
    registryPath,
    "--db",
    demoDb,
  ];
}

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

  it("cli_wf_complete_check_truth_verdict_stderr", () => {
    const r = spawnSync(process.execPath, argvCheck("wf_complete"), { encoding: "utf8", cwd: root });
    assert.equal(r.status, 0, r.stderr);
    const verdictLine = truthVerdictLine(r.stderr);
    assert.equal(verdictLine, "truth_check_verdict: trusted", r.stderr?.slice(0, 400));
    const line = r.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
    const o = JSON.parse(line);
    assert.equal(o.runKind, "contract_sql");
    assert.equal(o.stateRelation, "matches_expectations");
    assert.ok(o.steps?.length >= 1, "outcome certificate includes at least one step");
  });

  it("cli_wf_missing_check_truth_verdict_stderr", () => {
    const r = spawnSync(process.execPath, argvCheck("wf_missing"), { encoding: "utf8", cwd: root });
    assert.equal(r.status, 1, r.stderr);
    assert.equal(truthVerdictLine(r.stderr), "truth_check_verdict: not_trusted");
    const line = r.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
    const o = JSON.parse(line);
    assert.equal(o.stateRelation, "does_not_match");
    const rowAbsent = o.explanation.details.find((d) => d.code === "ROW_ABSENT");
    assert.ok(rowAbsent, "ROW_ABSENT in certificate explanation details");
  });

  it("no_steps_message_matches_template_for_wrong_workflow_id_fixture", () => {
    const { eventFileAggregateCounts } = loadEventsForWorkflow(wrongWfFixture, "wf_requested");
    const expectedMsg = formatNoStepsForWorkflowMessage("wf_requested", eventFileAggregateCounts);
    const r = spawnSync(
      process.execPath,
      [
        "--no-warnings",
        cliJs,
        "check",
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
    assert.equal(truthVerdictLine(r.stderr), "truth_check_verdict: unknown");
    const line = r.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
    const o = JSON.parse(line);
    const rl = o.explanation.details.find((x) => x.code === "NO_STEPS_FOR_WORKFLOW");
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
        "check",
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
    assert.equal(truthVerdictLine(stderr), "truth_check_verdict: unknown");
  });

  it("check_operational_stderr_has_no_truth_check_verdict", () => {
    const missingRegistry = join(root, `ghost-registry-${Date.now()}.json`);
    const r = spawnSync(
      process.execPath,
      ["--no-warnings", cliJs, "check", "--workflow-id", "wf_complete", "--events", eventsPath, "--registry", missingRegistry, "--db", demoDb],
      {
        encoding: "utf8",
        cwd: root,
      },
    );
    assert.equal(r.status, 3, r.stderr);
    assert.match(r.stderr, /"code"\s*:/, "operational JSON envelope");
    assert.equal(/truth_check_verdict:/.test(r.stderr), false, "no verdict line on operational failure");
  });
});
