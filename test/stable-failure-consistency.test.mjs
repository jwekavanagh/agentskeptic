/**
 * Frozen-input consistency: verifyWorkflow output matches committed fixtures;
 * repeated runs are deep-equal.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { verifyWorkflow } from "../dist/pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("stable failure fixtures", () => {
  let dir;
  let dbPath;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "etl-stable-"));
    dbPath = join(dir, "test.db");
    const sql = readFileSync(join(root, "examples", "seed.sql"), "utf8");
    const db = new DatabaseSync(dbPath);
    db.exec(sql);
    db.close();
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const eventsPath = join(root, "examples", "events.ndjson");
  const registryPath = join(root, "examples", "tools.json");

  it("empty workflow id (no matching events) matches fixture", async () => {
    const expected = JSON.parse(
      readFileSync(
        join(root, "test", "fixtures", "stable-failure", "empty-workflow-no-matching-events.json"),
        "utf8",
      ),
    );
    const r = await verifyWorkflow({
      workflowId: "no_such_workflow",
      eventsPath,
      registryPath,
      database: { kind: "sqlite", path: dbPath },
      logStep: () => {},
      truthReport: () => {},
    });
    assert.deepStrictEqual(r, expected);
  });

  it("two runs with same inputs produce deep-equal results", async () => {
    const opts = {
      workflowId: "no_such_workflow",
      eventsPath,
      registryPath,
      database: { kind: "sqlite", path: dbPath },
      logStep: () => {},
      truthReport: () => {},
    };
    const a = await verifyWorkflow(opts);
    const b = await verifyWorkflow(opts);
    assert.deepStrictEqual(a, b);
  });
});
