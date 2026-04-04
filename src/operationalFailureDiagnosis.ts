import { deriveActionableFailureOperational } from "./actionableFailure.js";
import type { OperationalCode } from "./cliOperationalCodes.js";
import { OPERATIONAL_CODE_TO_ORIGIN, OPERATIONAL_CODE_TO_SUMMARY } from "./failureOriginCatalog.js";
import type { CliFailureDiagnosis } from "./types.js";

export function buildOperationalFailureDiagnosis(code: string): CliFailureDiagnosis {
  const c = code as OperationalCode;
  const primaryOrigin = OPERATIONAL_CODE_TO_ORIGIN[c];
  const summary = OPERATIONAL_CODE_TO_SUMMARY[c];
  const actionableFailure = deriveActionableFailureOperational(code);
  if (primaryOrigin === undefined || summary === undefined) {
    return {
      summary: "Operational failure; origin could not be classified.",
      primaryOrigin: "workflow_flow",
      confidence: "low",
      evidence: [{ referenceCode: code }],
      actionableFailure,
    };
  }
  return {
    summary,
    primaryOrigin,
    confidence: "high",
    evidence: [{ referenceCode: code }],
    actionableFailure,
  };
}
