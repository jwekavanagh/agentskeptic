/**
 * OSS batch verify: removed --output-lock flag must fail with ENFORCE_USAGE.
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

describe("OSS batch removed --output-lock", () => {
  it("rejects removed flag and exits 3", () => {
    const dir = mkdtempSync(join(tmpdir(), "oss-out-lock-"));
    try {
      const dbPath = join(dir, "demo.db");
      const sql = readFileSync(join(root, "examples", "seed.sql"), "utf8");
      const db = new DatabaseSync(dbPath);
      db.exec(sql);
      db.close();
      const lockPath = join(dir, "out.ci-lock-v1.json");
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
          lockPath,
        ],
        { encoding: "utf8", cwd: root },
      );
      assert.equal(r.status, 3, r.stderr);
      const envelope = JSON.parse(r.stderr.trim());
      assert.equal(envelope.code, "ENFORCE_USAGE");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
