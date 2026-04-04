import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FAILURE_ORIGINS } from "./failureOriginTypes.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function enumFromWorkflowTruthSchema(): string[] {
  const raw = readFileSync(path.join(root, "schemas", "workflow-truth-report.schema.json"), "utf8");
  const j = JSON.parse(raw) as {
    $defs?: { failureOrigin?: { enum?: string[] } };
  };
  const e = j.$defs?.failureOrigin?.enum;
  if (!Array.isArray(e)) throw new Error("missing failureOrigin enum in workflow-truth-report.schema.json");
  return [...e].sort((a, b) => a.localeCompare(b));
}

function enumFromCliErrorSchema(): string[] {
  const raw = readFileSync(path.join(root, "schemas", "cli-error-envelope.schema.json"), "utf8");
  const j = JSON.parse(raw) as {
    properties?: {
      failureDiagnosis?: {
        properties?: { primaryOrigin?: { enum?: string[] } };
      };
    };
  };
  const e = j.properties?.failureDiagnosis?.properties?.primaryOrigin?.enum;
  if (!Array.isArray(e)) throw new Error("missing primaryOrigin enum in cli-error-envelope.schema.json");
  return [...e].sort((a, b) => a.localeCompare(b));
}

describe("FailureOrigin JSON Schema parity", () => {
  it("workflow-truth-report failureOrigin enum matches FAILURE_ORIGINS tuple", () => {
    const fromSchema = enumFromWorkflowTruthSchema();
    const fromTs = [...FAILURE_ORIGINS].sort((a, b) => a.localeCompare(b));
    expect(fromSchema).toEqual(fromTs);
  });

  it("cli-error-envelope primaryOrigin enum matches FAILURE_ORIGINS tuple", () => {
    expect(enumFromCliErrorSchema()).toEqual([...FAILURE_ORIGINS].sort((a, b) => a.localeCompare(b)));
  });
});
