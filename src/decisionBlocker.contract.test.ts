import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildOutcomeCertificateFromWorkflowResult } from "./outcomeCertificate.js";
import { formatDecisionBlockerForHumans } from "./decisionBlocker.js";
import { verifyWorkflow } from "./pipeline.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("formatDecisionBlockerForHumans contract", () => {
  /** Seeded SQLite under tmp — `examples/demo.db` is gitignored and absent on clean CI. */
  let workDir: string;
  let dbPath: string;

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), "agentskeptic-decision-blocker-"));
    dbPath = join(workDir, "demo.db");
    const sql = readFileSync(join(root, "examples", "seed.sql"), "utf8");
    const db = new DatabaseSync(dbPath);
    db.exec(sql);
    db.close();
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it("emits exactly six lines with required tokens for wf_missing certificate", async () => {
    const eventsPath = join(root, "examples", "events.ndjson");
    const registryPath = join(root, "examples", "tools.json");
    const result = await verifyWorkflow({
      workflowId: "wf_missing",
      eventsPath,
      registryPath,
      database: { kind: "sqlite", path: dbPath },
      logStep: () => {},
      truthReport: () => {},
    });
    const certificate = buildOutcomeCertificateFromWorkflowResult(result, "contract_sql");
    const { lines, trustDecision } = formatDecisionBlockerForHumans(certificate);
    expect(trustDecision).toBe("unsafe");
    expect(lines).toHaveLength(6);
    expect(lines[0]).toMatch(/^Trust: unsafe$/);
    expect(lines[1]).toMatch(/^Workflow: wf_missing$/);
    expect(lines[2]).toMatch(/^First problem step: seq=/);
    expect(lines[2]).toContain("tool=crm.upsert_contact");
    expect(lines[2]).toContain("status=missing");
    expect(lines[3]).toContain("ROW_ABSENT");
    expect(lines[4]).toMatch(/^Expected: /);
    expect(lines[5]).toMatch(/^Observed: /);
  });
});
