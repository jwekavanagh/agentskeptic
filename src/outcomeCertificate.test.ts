import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadSchemaValidator } from "./schemaLoad.js";
import { verifyWorkflow } from "./pipeline.js";
import {
  assertOutcomeCertificateInvariants,
  buildOutcomeCertificateFromWorkflowResult,
  deriveHighStakesReliance,
  formatOutcomeCertificateHuman,
} from "./outcomeCertificate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("outcomeCertificate", () => {
  it("deriveHighStakesReliance matches normative table", () => {
    expect(deriveHighStakesReliance("quick_preview", "matches_expectations")).toBe("prohibited");
    expect(deriveHighStakesReliance("contract_sql", "matches_expectations")).toBe("permitted");
    expect(deriveHighStakesReliance("contract_sql", "does_not_match")).toBe("prohibited");
    expect(deriveHighStakesReliance("contract_sql", "not_established")).toBe("prohibited");
  });

  it("wf_complete certificate passes schema and invariants", async () => {
    const result = await verifyWorkflow({
      workflowId: "wf_complete",
      eventsPath: join(root, "examples", "events.ndjson"),
      registryPath: join(root, "examples", "tools.json"),
      database: { kind: "sqlite", path: join(root, "examples", "demo.db") },
      logStep: () => {},
      truthReport: () => {},
    });
    const certificate = buildOutcomeCertificateFromWorkflowResult(result, "contract_sql");
    const validate = loadSchemaValidator("outcome-certificate-v1");
    expect(validate(certificate)).toBe(true);
    assertOutcomeCertificateInvariants(certificate);
    expect(formatOutcomeCertificateHuman(certificate)).toBe(certificate.humanReport);
  });

  it("wf_missing certificate is does_not_match", async () => {
    const result = await verifyWorkflow({
      workflowId: "wf_missing",
      eventsPath: join(root, "examples", "events.ndjson"),
      registryPath: join(root, "examples", "tools.json"),
      database: { kind: "sqlite", path: join(root, "examples", "demo.db") },
      logStep: () => {},
      truthReport: () => {},
    });
    const certificate = buildOutcomeCertificateFromWorkflowResult(result, "contract_sql");
    expect(certificate.stateRelation).toBe("does_not_match");
    expect(certificate.highStakesReliance).toBe("prohibited");
  });
});
