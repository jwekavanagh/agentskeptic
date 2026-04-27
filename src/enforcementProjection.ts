import type { WorkflowResult } from "./types.js";
import { stableStringify } from "./jsonStableStringify.js";

function sortedUniqueStrings(arr: string[]): string[] {
  return [...new Set(arr)].sort((a, b) => a.localeCompare(b));
}

export type EnforcementProjectionV1 = {
  schemaVersion: 1;
  workflowId: string;
  status: WorkflowResult["status"];
  verificationPolicy: WorkflowResult["verificationPolicy"];
  runLevelReasonCodes: string[];
  stepReasonCodes: Array<{ seq: number; toolId: string; reasonCodes: string[] }>;
};

export function workflowResultToEnforcementProjectionV1(result: WorkflowResult): EnforcementProjectionV1 {
  return {
    schemaVersion: 1,
    workflowId: result.workflowId,
    status: result.status,
    verificationPolicy: result.verificationPolicy,
    runLevelReasonCodes: sortedUniqueStrings(result.runLevelReasons.map((r) => r.code)),
    stepReasonCodes: result.steps.map((s) => ({
      seq: s.seq,
      toolId: s.toolId,
      reasonCodes: sortedUniqueStrings(s.reasons.map((r) => r.code)),
    })),
  };
}

export { stableStringify };

