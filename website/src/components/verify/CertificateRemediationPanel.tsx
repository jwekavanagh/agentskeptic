"use client";

import { AUTOMATION_BOUNDARY_CONNECTOR } from "@/lib/automationBoundaryConnector";
import type { BundledOutcomeCertificate } from "@/lib/verifyBundled.contract";

function verdictLabelForStateRelation(stateRelation: BundledOutcomeCertificate["stateRelation"]): string {
  if (stateRelation === "matches_expectations") return "Reality matches the expectation";
  if (stateRelation === "does_not_match") return "Reality contradicts the claim";
  return "Not determined";
}

export type CertificateRemediationPanelProps = {
  certificate: BundledOutcomeCertificate;
};

/** Structured remediation summary for `/api/verify` outcome certificates (presentational; no I/O). */
export function CertificateRemediationPanel(props: CertificateRemediationPanelProps) {
  const { certificate } = props;
  const af = certificate.failureSpine.actionableFailure;
  const ec = certificate.evidenceCompleteness;
  const primaryLine = ec.nextActions[0]?.text ?? "";
  const remediationItems = [...(ec.remediationItems ?? [])].sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
  const showAutomationBoundary =
    af.automationSafe && af.recommendedAction === "improve_read_connectivity";

  return (
    <div className="certificate-remediation-panel">
      <h2 data-testid="remediation-verdict-label">{verdictLabelForStateRelation(certificate.stateRelation)}</h2>
      <p data-testid="remediation-primary-action" className="lede">
        {primaryLine}
      </p>
      {remediationItems.length > 0 ? (
        <div className="remediation-items" data-testid="remediation-items">
          {remediationItems.map((item) => (
            <section key={item.id} className="remediation-item">
              <h3>{item.failedCheck}</h3>
              <dl className="remediation-dl">
                <dt>Action</dt>
                <dd>{item.actionText}</dd>
                <dt>Expected state</dt>
                <dd>{item.expectedState.summary}</dd>
                <dt>Automation</dt>
                <dd>{item.automation.label}</dd>
                <dt>Rerun</dt>
                <dd>{item.rerunPath.readinessLabel}</dd>
                {item.humanReview.required && item.humanReview.decisionPrompt !== undefined ? (
                  <>
                    <dt>Manual review</dt>
                    <dd>{item.humanReview.decisionPrompt}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          ))}
        </div>
      ) : null}
      <dl className="remediation-dl">
        <dt>Failure category</dt>
        <dd>{af.category}</dd>
        <dt>Severity</dt>
        <dd>{af.severity}</dd>
        <dt>Evidence gap</dt>
        <dd>{ec.blockerCategory}</dd>
        {ec.rerunPath !== undefined && remediationItems.length === 0 ? (
          <>
            <dt>Rerun</dt>
            <dd>{ec.rerunPath.readinessLabel}</dd>
          </>
        ) : null}
      </dl>
      {showAutomationBoundary ? (
        <p data-testid="remediation-automation-boundary" className="muted">
          {AUTOMATION_BOUNDARY_CONNECTOR}
        </p>
      ) : null}
    </div>
  );
}
