import type { StepStatus, WorkflowResult, WorkflowStatus } from "./types.js";

export const STEP_STATUS_TRUTH_LABELS: Record<StepStatus, string> = {
  verified: "VERIFIED",
  missing: "FAILED_ROW_MISSING",
  inconsistent: "FAILED_VALUE_MISMATCH",
  incomplete_verification: "INCOMPLETE_CANNOT_VERIFY",
};

const TRUST_LINE_BY_STATUS: Record<WorkflowStatus, string> = {
  complete: "TRUSTED: Every step matched the database under the configured verification rules.",
  incomplete: "NOT_TRUSTED: Verification is incomplete; the workflow cannot be fully confirmed.",
  inconsistent:
    "NOT_TRUSTED: At least one step failed verification against the database (determinate failure).",
};

function sanitizeOneLineId(value: string): string {
  return value.replace(/\r\n|\r|\n/g, "_");
}

function singleLineIntended(effect: string): string {
  const withSpaces = effect.replace(/\r\n|\r|\n/g, " ");
  return withSpaces.replace(/ +/g, " ").trim();
}

export function formatWorkflowTruthReport(result: WorkflowResult): string {
  const lines: string[] = [];

  lines.push(`workflow_id: ${sanitizeOneLineId(result.workflowId)}`);
  lines.push(`workflow_status: ${result.status}`);
  lines.push(`trust: ${TRUST_LINE_BY_STATUS[result.status]}`);

  if (result.runLevelReasons.length === 0) {
    lines.push("run_level: (none)");
  } else {
    lines.push("run_level:");
    for (const r of result.runLevelReasons) {
      const msg = r.message.trim();
      const human = msg.length > 0 ? msg : "(no message)";
      lines.push(`  - ${r.code}: ${human}`);
    }
  }

  lines.push("steps:");
  for (const s of result.steps) {
    const toolId = sanitizeOneLineId(s.toolId);
    const label = STEP_STATUS_TRUTH_LABELS[s.status];
    lines.push(`  - seq=${s.seq} tool=${toolId} status=${label}`);
    lines.push(
      `    observations: evaluated=${s.evaluatedObservationOrdinal} of ${s.repeatObservationCount} in_capture_order`,
    );
    for (const r of s.reasons) {
      const msg = r.message.trim();
      const human = msg.length > 0 ? msg : "(no message)";
      let line = `    reason: [${r.code}] ${human}`;
      if (r.field !== undefined && r.field.length > 0) {
        line += ` field=${r.field}`;
      }
      lines.push(line);
    }
    const intended = singleLineIntended(s.intendedEffect);
    if (intended.length > 0) {
      lines.push(`    intended: ${intended}`);
    }
  }

  return lines.join("\n");
}
