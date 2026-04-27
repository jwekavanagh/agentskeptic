/**
 * Batch verify with removed lock flags exits ENFORCE_USAGE.
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

describe("removed lock flag enforcement", () => {
  it("batch verify with --output-lock exits 3 ENFORCE_USAGE", () => {
    const dir = mkdtempSync(join(tmpdir(), "lock-footer-"));
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
          join(root, "examples", "events.ndjson"),
          "--registry",
          join(root, "examples", "tools.json"),
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
