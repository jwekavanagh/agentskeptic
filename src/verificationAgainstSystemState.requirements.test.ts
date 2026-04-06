import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { loadSchemaValidator } from "./schemaLoad.js";
import { verifyWorkflow } from "./pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

describe("Slice 2–3: verification against system state (requirements)", () => {
  let dir: string;
  let dbPath: string;
  const eventsPath = join(repoRoot, "examples", "events.ndjson");
  const registryPath = join(repoRoot, "examples", "tools.json");
  const noop = () => {};
  const validateWorkflowResult = loadSchemaValidator("workflow-result");
  const validateEvent = loadSchemaValidator("event");

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "etl-slice2-"));
    dbPath = join(dir, "verify.db");
    const sql = readFileSync(join(repoRoot, "examples", "seed.sql"), "utf8");
    const db = new DatabaseSync(dbPath);
    db.exec(sql);
    db.close();
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const sqliteDb = () => ({ kind: "sqlite" as const, path: dbPath });

  it("A: verified outcome matches DB", async () => {
    const r = await verifyWorkflow({
      workflowId: "wf_complete",
      eventsPath,
      registryPath,
      database: sqliteDb(),
      logStep: noop,
      truthReport: noop,
    });
    expect(r.status).toBe("complete");
    expect(r.steps[0]?.status).toBe("verified");
    expect(r.steps[0]?.reasons).toEqual([]);
    expect(r.workflowTruthReport.steps[0]?.outcomeLabel).toBe("VERIFIED");
    expect(r.steps[0]?.evidenceSummary?.rowCount).toBe(1);
    expect(validateWorkflowResult(r)).toBe(true);
  });

  it("B: missing record despite capture", async () => {
    const r = await verifyWorkflow({
      workflowId: "wf_missing",
      eventsPath,
      registryPath,
      database: sqliteDb(),
      logStep: noop,
      truthReport: noop,
    });
    expect(r.steps[0]?.status).toBe("missing");
    expect(r.steps[0]?.reasons[0]?.code).toBe("ROW_ABSENT");
    expect(r.steps[0]?.evidenceSummary?.rowCount).toBe(0);
    expect(r.workflowTruthReport.steps[0]?.outcomeLabel).toBe("FAILED_ROW_MISSING");
  });

  it("C: success-shaped params do not imply verified without row", async () => {
    const p = join(dir, "slice2_fake_ok.ndjson");
    writeFileSync(
      p,
      `${JSON.stringify({
        schemaVersion: 1,
        workflowId: "wf_slice2_fake_ok",
        seq: 0,
        type: "tool_observed",
        toolId: "crm.upsert_contact",
        params: {
          ok: true,
          recordId: "nope",
          fields: { name: "x", status: "y" },
        },
      })}\n`,
    );
    const r = await verifyWorkflow({
      workflowId: "wf_slice2_fake_ok",
      eventsPath: p,
      registryPath,
      database: sqliteDb(),
      logStep: noop,
      truthReport: noop,
    });
    expect(r.steps[0]?.status).toBe("missing");
    expect(r.steps[0]?.reasons[0]?.code).toBe("ROW_ABSENT");
  });

  it("D: wrong value vs expected", async () => {
    const r = await verifyWorkflow({
      workflowId: "wf_partial",
      eventsPath,
      registryPath,
      database: sqliteDb(),
      logStep: noop,
      truthReport: noop,
    });
    expect(r.steps[0]?.status).toBe("inconsistent");
    expect(r.steps[0]?.reasons[0]?.code).toBe("VALUE_MISMATCH");
    expect(r.steps[0]?.evidenceSummary).toMatchObject({
      expected: expect.any(String),
      actual: expect.any(String),
      field: expect.any(String),
    });
    expect(r.workflowTruthReport.steps[0]?.outcomeLabel).toBe("FAILED_VALUE_MISMATCH");
  });

  it("E: duplicate rows in system state", async () => {
    const r = await verifyWorkflow({
      workflowId: "wf_duplicate_rows",
      eventsPath,
      registryPath,
      database: sqliteDb(),
      logStep: noop,
      truthReport: noop,
    });
    expect(r.steps[0]?.status).toBe("inconsistent");
    expect(r.steps[0]?.reasons[0]?.code).toBe("DUPLICATE_ROWS");
  });

  it("F: multi-step — which step failed", async () => {
    const ev0 = {
      schemaVersion: 1,
      workflowId: "wf_slice2_twostep",
      seq: 0,
      type: "tool_observed" as const,
      toolId: "crm.upsert_contact",
      params: { recordId: "c_ok", fields: { name: "Alice", status: "active" } },
    };
    const ev1 = {
      schemaVersion: 1,
      workflowId: "wf_slice2_twostep",
      seq: 1,
      type: "tool_observed" as const,
      toolId: "crm.upsert_contact",
      params: { recordId: "missing_id", fields: { name: "X", status: "Y" } },
    };
    const p = join(dir, "slice2_twostep.ndjson");
    writeFileSync(p, `${JSON.stringify(ev0)}\n${JSON.stringify(ev1)}\n`);
    const r = await verifyWorkflow({
      workflowId: "wf_slice2_twostep",
      eventsPath: p,
      registryPath,
      database: sqliteDb(),
      logStep: noop,
      truthReport: noop,
    });
    expect(r.steps.length).toBe(2);
    expect(r.steps[0]?.seq).toBe(0);
    expect(r.steps[0]?.status).toBe("verified");
    expect(r.steps[1]?.seq).toBe(1);
    expect(r.steps[1]?.status).toBe("missing");
    expect(r.workflowTruthReport.steps[0]?.seq).toBe(0);
    expect(r.workflowTruthReport.steps[0]?.outcomeLabel).toBe("VERIFIED");
    expect(r.workflowTruthReport.steps[1]?.seq).toBe(1);
    expect(r.workflowTruthReport.steps[1]?.outcomeLabel).toBe("FAILED_ROW_MISSING");
  });

  it("G: expectations cannot be smuggled on the event", () => {
    const bad = {
      schemaVersion: 1,
      workflowId: "w",
      seq: 0,
      type: "tool_observed",
      toolId: "t",
      params: {},
      expectation: {},
    };
    expect(validateEvent(bad)).toBe(false);
  });
});
