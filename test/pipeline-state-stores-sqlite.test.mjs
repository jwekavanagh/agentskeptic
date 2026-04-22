import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { verifyWorkflow } from "../dist/pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const fixture = (...p) => join(root, "test/fixtures/state-stores-sqlite", ...p);

describe("verifyWorkflow sqlite + vector_document", () => {
  let dir;
  let dbPath;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "as-state-stores-"));
    dbPath = join(dir, "db.sqlite");
    const db = new DatabaseSync(dbPath);
    db.exec(readFileSync(join(root, "examples", "seed.sql"), "utf8"));
    db.close();
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("yields incomplete_verification with STATE_WITNESS_UNAVAILABLE_IN_SQLITE_FILE_MODE (never verified)", async () => {
    const r = await verifyWorkflow({
      workflowId: "wf_vector_sqlite",
      eventsPath: fixture("events.ndjson"),
      registryPath: fixture("registry.json"),
      database: { kind: "sqlite", path: dbPath },
      logStep: () => {},
      truthReport: () => {},
    });
    assert.equal(r.status, "incomplete");
    const step = r.steps[0];
    assert.ok(step);
    assert.equal(step.status, "incomplete_verification");
    assert.equal(step.reasons[0]?.code, "STATE_WITNESS_UNAVAILABLE_IN_SQLITE_FILE_MODE");
    assert.equal(step.failureDiagnostic, "verification_setup");
  });
});
