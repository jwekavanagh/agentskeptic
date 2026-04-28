import type { OutcomeCertificateV1 } from "../outcomeCertificate.js";

const HINTS: Array<{ codePrefix: string; likelyCause: string; nextAction: string }> = [
  {
    codePrefix: "UNKNOWN_TOOL",
    likelyCause: "Observed tool usage is missing from the registry mapping.",
    nextAction: "Add or fix the tool mapping in your registry file, then rerun `agentskeptic loop`.",
  },
  {
    codePrefix: "MISSING",
    likelyCause: "Expected persisted row/effect was not found in the target data store.",
    nextAction: "Verify your write path completed and committed to the expected database, then rerun.",
  },
  {
    codePrefix: "INCONSISTENT",
    likelyCause: "Persisted values differ from expected contract values.",
    nextAction: "Inspect declared expected values vs stored values, fix the mismatch source, then rerun.",
  },
  {
    codePrefix: "INCOMPLETE",
    likelyCause: "Verification could not establish a complete, determinate state.",
    nextAction: "Fix event completeness/registry coverage and rerun after a fresh workflow execution.",
  },
];

export function buildFailureHint(certificate: OutcomeCertificateV1): { likelyCause: string; nextAction: string } {
  const details = certificate.explanation.details ?? [];
  for (const d of details) {
    const code = String(d.code ?? "").toUpperCase();
    const hit = HINTS.find((h) => code.startsWith(h.codePrefix));
    if (hit) return { likelyCause: hit.likelyCause, nextAction: hit.nextAction };
  }
  return {
    likelyCause: certificate.relianceRationale,
    nextAction: "Inspect the WHY section and fix the cited mismatch/incompleteness, then rerun `agentskeptic loop`.",
  };
}
