import type { QuickVerifyReport } from "./quickVerify/runQuickVerify.js";
import { formatQuickVerifyHumanReport } from "./quickVerify/formatQuickVerifyHumanReport.js";
import type { WorkflowResult, WorkflowTruthStep } from "./types.js";
import { formatWorkflowTruthReportStruct } from "./workflowTruthReport.js";

export type OutcomeCertificateRunKind = "contract_sql" | "quick_preview";

export type OutcomeCertificateStateRelation =
  | "matches_expectations"
  | "does_not_match"
  | "not_established";

export type OutcomeCertificateHighStakesReliance = "permitted" | "prohibited";

export type OutcomeCertificateExplanationDetail = {
  code: string;
  message: string;
};

export type OutcomeCertificateStep = {
  seq: number;
  toolId?: string;
  declaredAction: string;
  expectedOutcome: string;
  observedOutcome: string;
};

/** Public verification artifact (v1). Normative: docs/outcome-certificate-normative.md */
export type OutcomeCertificateV1 = {
  schemaVersion: 1;
  workflowId: string;
  runKind: OutcomeCertificateRunKind;
  stateRelation: OutcomeCertificateStateRelation;
  highStakesReliance: OutcomeCertificateHighStakesReliance;
  relianceRationale: string;
  intentSummary: string;
  explanation: {
    headline: string;
    details: OutcomeCertificateExplanationDetail[];
  };
  steps: OutcomeCertificateStep[];
  humanReport: string;
};

export function deriveHighStakesReliance(
  runKind: OutcomeCertificateRunKind,
  stateRelation: OutcomeCertificateStateRelation,
): OutcomeCertificateHighStakesReliance {
  if (runKind === "quick_preview") return "prohibited";
  if (stateRelation === "matches_expectations") return "permitted";
  return "prohibited";
}

export function workflowResultToStateRelation(result: WorkflowResult): OutcomeCertificateStateRelation {
  if (result.status === "complete") return "matches_expectations";
  if (result.status === "inconsistent") return "does_not_match";
  return "not_established";
}

function truthStepToCertificateStep(step: WorkflowTruthStep): OutcomeCertificateStep {
  return {
    seq: step.seq,
    toolId: step.toolId,
    declaredAction: step.intendedEffect.narrative,
    expectedOutcome: step.verifyTarget ?? step.intendedEffect.narrative,
    observedOutcome: step.observedStateSummary,
  };
}

function buildRelianceRationale(
  runKind: OutcomeCertificateRunKind,
  stateRelation: OutcomeCertificateStateRelation,
  highStakesReliance: OutcomeCertificateHighStakesReliance,
): string {
  if (runKind === "quick_preview") {
    return "Quick preview uses inferred, provisional checks. It is never sufficient as the sole basis for high-stakes ship, bill, compliance, or audit-final decisions—even when state appears to match.";
  }
  if (highStakesReliance === "permitted") {
    return "Contract verification used your registry and read-only SQL; every captured step matched declared expectations under the configured rules. You may treat this artifact as decision-grade for those steps, subject to your own scope and retention policy.";
  }
  if (stateRelation === "does_not_match") {
    return "At least one step failed verification against the database (missing row, wrong values, or partial multi-effect failure). Do not treat this run as meeting its intended persisted outcome.";
  }
  return "Verification could not be completed or could not establish a determinate match (incomplete registry, empty capture, indeterminate window, or connector issue). Do not treat absence of a mismatch as proof of success.";
}

function buildExplanationFromWorkflowResult(result: WorkflowResult): OutcomeCertificateV1["explanation"] {
  const truth = result.workflowTruthReport;
  const details: OutcomeCertificateExplanationDetail[] = [];
  for (const step of truth.steps) {
    for (const r of step.reasons) {
      details.push({ code: r.code, message: r.message });
    }
  }
  for (const r of result.runLevelReasons) {
    details.push({ code: r.code, message: r.message });
  }
  const fe = truth.failureExplanation;
  const headline =
    truth.failureAnalysis?.summary ??
    (fe !== null ? `${fe.divergence} — expected: ${fe.expected}; observed: ${fe.observed}` : truth.trustSummary);
  return { headline, details };
}

/**
 * Build Outcome Certificate from a finalized contract `WorkflowResult` (batch / library verify).
 */
export function buildOutcomeCertificateFromWorkflowResult(
  result: WorkflowResult,
  runKind: "contract_sql",
): OutcomeCertificateV1 {
  const stateRelation = workflowResultToStateRelation(result);
  const highStakesReliance = deriveHighStakesReliance(runKind, stateRelation);
  const truth = result.workflowTruthReport;
  const steps = truth.steps.map(truthStepToCertificateStep);
  const humanReport = formatWorkflowTruthReportStruct(truth);
  const cert: OutcomeCertificateV1 = {
    schemaVersion: 1,
    workflowId: result.workflowId,
    runKind,
    stateRelation,
    highStakesReliance,
    relianceRationale: buildRelianceRationale(runKind, stateRelation, highStakesReliance),
    intentSummary: truth.trustSummary,
    explanation: buildExplanationFromWorkflowResult(result),
    steps,
    humanReport,
  };
  assertOutcomeCertificateInvariants(cert);
  return cert;
}

function quickVerdictToStateRelation(verdict: QuickVerifyReport["verdict"]): OutcomeCertificateStateRelation {
  if (verdict === "pass") return "matches_expectations";
  if (verdict === "fail") return "does_not_match";
  return "not_established";
}

export type BuildQuickOutcomeCertificateOptions = {
  report: QuickVerifyReport;
  workflowId: string;
  humanReportOptions: Parameters<typeof formatQuickVerifyHumanReport>[1];
};

export function buildOutcomeCertificateFromQuickReport(options: BuildQuickOutcomeCertificateOptions): OutcomeCertificateV1 {
  const { report, workflowId, humanReportOptions } = options;
  const runKind = "quick_preview" as const;
  const stateRelation = quickVerdictToStateRelation(report.verdict);
  const highStakesReliance = deriveHighStakesReliance(runKind, stateRelation);
  const humanReport = formatQuickVerifyHumanReport(report, humanReportOptions);
  const details: OutcomeCertificateExplanationDetail[] = [];
  for (const u of report.units) {
    if (u.verdict !== "verified") {
      details.push({
        code: `quick_unit_${u.verdict}`,
        message: u.reconciliation?.verification_verdict ?? u.verdict,
      });
    }
  }
  const cert: OutcomeCertificateV1 = {
    schemaVersion: 1,
    workflowId,
    runKind,
    stateRelation,
    highStakesReliance,
    relianceRationale: buildRelianceRationale(runKind, stateRelation, highStakesReliance),
    intentSummary: report.summary,
    explanation: {
      headline: report.summary,
      details,
    },
    steps: report.units.map((u, i) => ({
      seq: i,
      declaredAction: `${u.sourceAction.toolName} (unit ${u.unitId})`,
      expectedOutcome: u.reconciliation.expected,
      observedOutcome: u.reconciliation.observed_database,
    })),
    humanReport,
  };
  assertOutcomeCertificateInvariants(cert);
  return cert;
}

export function formatOutcomeCertificateHuman(certificate: OutcomeCertificateV1): string {
  return certificate.humanReport;
}

export function assertOutcomeCertificateInvariants(certificate: OutcomeCertificateV1): void {
  const expected = deriveHighStakesReliance(certificate.runKind, certificate.stateRelation);
  if (certificate.highStakesReliance !== expected) {
    throw new Error(
      `outcome_certificate: highStakesReliance ${certificate.highStakesReliance} !== derived ${expected} for runKind=${certificate.runKind} stateRelation=${certificate.stateRelation}`,
    );
  }
  if (formatOutcomeCertificateHuman(certificate) !== certificate.humanReport) {
    throw new Error("outcome_certificate: humanReport must equal formatOutcomeCertificateHuman(certificate)");
  }
}
