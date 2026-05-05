import {
  SHARED_REPORT_HEADLINE_FALLBACK,
  SHARED_REPORT_NEXT_FALLBACK_NON_TRUSTED,
  SHARED_REPORT_NEXT_TRUSTED,
  SHARED_REPORT_REASON_FALLBACK,
  SHARED_REPORT_VERDICT_NOT_TRUSTED,
  SHARED_REPORT_VERDICT_TRUSTED,
  SHARED_REPORT_VERDICT_UNKNOWN,
} from "./shareReportFallbacks";

/** Mirrors `truthCheckVerdictFromCertificate` in core (`src/outcomeCertificate.ts`) — duplicated here so the website bundle does not import the `agentskeptic` barrel (pulls Node-only deps under Vitest). */
export type TruthCheckVerdictLabel = "trusted" | "not_trusted" | "unknown";

function truthCheckVerdictFromStructured(cert: {
  stateRelation: string;
  highStakesReliance: string;
}): TruthCheckVerdictLabel {
  if (cert.stateRelation === "matches_expectations" && cert.highStakesReliance === "permitted") {
    return "trusted";
  }
  if (cert.stateRelation === "does_not_match") {
    return "not_trusted";
  }
  return "unknown";
}

/** Minimal certificate surface for summary derivation (structured fields only). */
export type CertificateForExecutiveSummary = {
  stateRelation: "matches_expectations" | "does_not_match" | "not_established";
  highStakesReliance: "permitted" | "prohibited";
  intentSummary: string;
  explanation: { headline: string; details: { code: string; message: string }[] };
  failureSpine: {
    summary: string;
    rerunGuidance: string;
  };
  evidenceCompleteness: {
    nextActions: { text?: string }[];
    remediationItems?: { actionText: string }[];
  };
};

export type SharedReportExecutiveModel = {
  verdictLabel: string;
  headline: string;
  reason: string;
  nextAction: string;
};

function firstDetailLine(cert: CertificateForExecutiveSummary): string | null {
  const d = cert.explanation.details[0];
  if (d === undefined) return null;
  const m = d.message.trim();
  const c = d.code.trim();
  if (m.length === 0 && c.length === 0) return null;
  return `${c}: ${m}`.trim();
}

function pickHeadline(cert: CertificateForExecutiveSummary): string {
  const h = cert.explanation.headline.trim();
  if (h.length > 0) return h;
  return SHARED_REPORT_HEADLINE_FALLBACK;
}

function pickReason(cert: CertificateForExecutiveSummary): string {
  const line = firstDetailLine(cert);
  if (line !== null) return line;
  const spineSum = cert.failureSpine.summary.trim();
  if (spineSum.length > 0) return spineSum;
  const intent = cert.intentSummary.trim();
  if (intent.length > 0) return intent;
  return SHARED_REPORT_REASON_FALLBACK;
}

function pickNextAction(cert: CertificateForExecutiveSummary, verdict: TruthCheckVerdictLabel): string {
  if (verdict === "trusted") {
    return SHARED_REPORT_NEXT_TRUSTED;
  }
  const rg = cert.failureSpine.rerunGuidance.trim();
  if (rg.length > 0) return rg;
  const na = cert.evidenceCompleteness.nextActions[0]?.text?.trim();
  if (na !== undefined && na.length > 0) return na;
  const ri = cert.evidenceCompleteness.remediationItems?.[0]?.actionText?.trim();
  if (ri !== undefined && ri.length > 0) return ri;
  return SHARED_REPORT_NEXT_FALLBACK_NON_TRUSTED;
}

function verdictLabelFor(v: TruthCheckVerdictLabel): string {
  if (v === "trusted") return SHARED_REPORT_VERDICT_TRUSTED;
  if (v === "not_trusted") return SHARED_REPORT_VERDICT_NOT_TRUSTED;
  return SHARED_REPORT_VERDICT_UNKNOWN;
}

/** Pure selectors over structured Outcome Certificate fields (no stderr / audit prose parsing). */
export function executiveSummaryFromCertificate(cert: CertificateForExecutiveSummary): SharedReportExecutiveModel {
  const verdict = truthCheckVerdictFromStructured(cert);
  return {
    verdictLabel: verdictLabelFor(verdict),
    headline: pickHeadline(cert),
    reason: pickReason(cert),
    nextAction: pickNextAction(cert, verdict),
  };
}

export function isOutcomeCertificateV3Payload(value: unknown): value is CertificateForExecutiveSummary {
  if (value === null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    o.schemaVersion === 3 &&
    typeof o.workflowId === "string" &&
    o.workflowId.length > 0 &&
    typeof o.stateRelation === "string" &&
    typeof o.highStakesReliance === "string" &&
    o.explanation !== null &&
    typeof o.explanation === "object" &&
    o.failureSpine !== null &&
    typeof o.failureSpine === "object" &&
    o.evidenceCompleteness !== null &&
    typeof o.evidenceCompleteness === "object"
  );
}
