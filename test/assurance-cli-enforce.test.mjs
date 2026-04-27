/**
 * Assurance + enforce (commercial dist only; run via commercial-enforce-test-harness.mjs).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "child_process";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cliJs = join(root, "dist", "cli.js");
const minimalCi = join(root, "examples", "minimal-ci-enforcement");

function runAssurance(args) {
  return spawnSync(
    process.execPath,
    ["--no-warnings", cliJs, "assurance", ...args],
    { encoding: "utf8", cwd: root },
  );
}

describe("assurance CLI enforce", () => {
  it("assurance run exits 1 when enforce drift check fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "etl-as-lock-"));
    try {
      const driftDb = join(dir, "drift.sqlite");
      copyFileSync(join(minimalCi, "ci-check.sqlite"), driftDb);
      const db = new DatabaseSync(driftDb);
      db.exec("UPDATE contacts SET status='inactive' WHERE id='c_ok';");
      db.close();
      const mpath = join(dir, "manifest.json");
      writeFileSync(
        mpath,
        JSON.stringify({
          schemaVersion: 1,
          scenarios: [
            {
              id: "broken_enforce",
              kind: "spawn_argv",
              argv: [
                "enforce",
                "--workflow-id",
                "wf_complete",
                "--events",
                join(minimalCi, "events.ndjson"),
                "--registry",
                join(minimalCi, "tools.json"),
                "--db",
                join(minimalCi, "ci-check.sqlite"),
                "--no-human-report",
                "--create-baseline",
              ],
            },
            {
              id: "drift_check",
              kind: "spawn_argv",
              argv: [
                "enforce",
                "--workflow-id",
                "wf_complete",
                "--events",
                join(minimalCi, "events.ndjson"),
                "--registry",
                join(minimalCi, "tools.json"),
                "--db",
                driftDb,
                "--no-human-report",
              ],
            },
          ],
        }),
        "utf8",
      );
      const r = runAssurance(["run", "--manifest", mpath]);
      assert.equal(r.status, 1);
      const lines = r.stdout.trim().split(/\r?\n/).filter((l) => l.length > 0);
      assert.equal(lines.length, 1);
      const envl = JSON.parse(lines[0]);
      assert.equal(envl.kind, "assurance_run");
      assert.equal(envl.runReport.scenarios.length, 2);
      assert.equal(envl.runReport.scenarios[0].exitCode, 0);
      assert.equal(envl.runReport.scenarios[1].exitCode, 4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
