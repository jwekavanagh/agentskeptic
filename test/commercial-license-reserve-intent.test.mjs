/**
 * Commercial dist: reserve intent uses verify for stateless verify and enforce for stateful enforce.
 *
 * Must run under scripts/commercial-enforce-test-harness.mjs (shared reserve mock + baked API URL).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "child_process";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cliJs = join(root, "dist", "cli.js");
const eventsPath = join(root, "examples", "events.ndjson");
const registryPath = join(root, "examples", "tools.json");

function intentLinesFromLog(logPath) {
  const t = readFileSync(logPath, "utf8").trim();
  if (!t) return [];
  return t.split(/\r?\n/).filter(Boolean);
}

describe("commercial license reserve intent", () => {
  it("batch verify uses verify intent; enforce uses enforce intent", () => {
    const logPath = process.env.HARNESS_RESERVE_INTENT_LOG;
    assert.ok(logPath, "expected HARNESS_RESERVE_INTENT_LOG from commercial-enforce-test-harness.mjs");
    const before = intentLinesFromLog(logPath).length;

    const dir = mkdtempSync(join(tmpdir(), "reserve-intent-"));
    try {
      const dbPath = join(dir, "demo.db");
      const sql = readFileSync(join(root, "examples", "seed.sql"), "utf8");
      const db = new DatabaseSync(dbPath);
      db.exec(sql);
      db.close();
      const env = {
        ...process.env,
        COMMERCIAL_LICENSE_API_BASE_URL: process.env.COMMERCIAL_LICENSE_API_BASE_URL,
        AGENTSKEPTIC_API_KEY: process.env.AGENTSKEPTIC_API_KEY ?? "wfv_test_harness_key",
        HARNESS_RESERVE_INTENT_LOG: logPath,
      };
      const r1 = spawnSync(
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
        ],
        { encoding: "utf8", cwd: root, env },
      );
      assert.equal(r1.status, 0, r1.stderr);
      const r2 = spawnSync(
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
        { encoding: "utf8", cwd: root, env },
      );
      assert.notEqual(r2.status, null);
      const delta = intentLinesFromLog(logPath).slice(before);
      assert.deepEqual(delta, ["verify", "enforce"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
