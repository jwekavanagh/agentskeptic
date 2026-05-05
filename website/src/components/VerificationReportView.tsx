import type { ReactNode } from "react";
import { productCopy } from "@/content/productCopy";
import { maybeLangGraphPanelFromCertificate } from "@/components/verification/LangGraphCertificatePanel";
import {
  SharedReportAuthorityNote,
  SharedReportExecutiveSummary,
} from "@/components/verification/SharedReportExecutiveSummary";
import {
  executiveSummaryFromCertificate,
  isOutcomeCertificateV3Payload,
  type CertificateForExecutiveSummary,
} from "@/lib/shareReportSummary";
import {
  SHARED_REPORT_LEGACY_ENVELOPE_NOTICE,
  SHARED_REPORT_MALFORMED_CERTIFICATE_NOTICE,
} from "@/lib/shareReportFallbacks";
import type { PublicReportEnvelope } from "@/lib/publicVerificationReportService";
type Props = {
  humanText: string;
  payload: PublicReportEnvelope;
  variant: "standalone" | "embed";
};

function machineJsonFromPayload(payload: PublicReportEnvelope): string {
  if ("schemaVersion" in payload && payload.schemaVersion === 3) {
    return JSON.stringify(payload.certificate, null, 2);
  }
  if ("kind" in payload && payload.kind === "workflow") {
    return JSON.stringify(payload.workflowResult, null, 2);
  }
  if ("kind" in payload && payload.kind === "quick") {
    return JSON.stringify(payload.quickReport, null, 2);
  }
  return JSON.stringify(payload, null, 2);
}

function kindLabel(payload: PublicReportEnvelope): string {
  if ("schemaVersion" in payload && payload.schemaVersion === 3) return "outcome_certificate";
  if ("kind" in payload) return payload.kind;
  return "unknown";
}

function decisionLayer(payload: PublicReportEnvelope): ReactNode {
  if ("schemaVersion" in payload && payload.schemaVersion === 3) {
    const raw = payload.certificate;
    if (raw !== null && typeof raw === "object" && isOutcomeCertificateV3Payload(raw)) {
      const model = executiveSummaryFromCertificate(raw as CertificateForExecutiveSummary);
      return (
        <>
          <SharedReportAuthorityNote />
          <SharedReportExecutiveSummary model={model} />
        </>
      );
    }
    return (
      <p className="muted" data-testid="shared-report-malformed-notice">
        {SHARED_REPORT_MALFORMED_CERTIFICATE_NOTICE}
      </p>
    );
  }
  if ("schemaVersion" in payload && payload.schemaVersion === 1) {
    return (
      <p className="muted" data-testid="shared-report-legacy-notice">
        {SHARED_REPORT_LEGACY_ENVELOPE_NOTICE}
      </p>
    );
  }
  return null;
}

export function VerificationReportView({ humanText, payload, variant }: Props) {
  const machineJson = machineJsonFromPayload(payload);
  const kind = kindLabel(payload);
  const langPanel =
    "schemaVersion" in payload && payload.schemaVersion === 3
      ? maybeLangGraphPanelFromCertificate(
          (payload as { schemaVersion: 3; certificate: unknown }).certificate,
        )
      : null;
  const decision = decisionLayer(payload);

  if (variant === "embed") {
    return (
      <section className="verification-report-embed" data-testid="verification-report-embed">
        <h2 className="verification-report-embed-title">Verification report</h2>
        <p className="muted">{productCopy.publicShareReportIntro}</p>
        <p className="muted">
          Kind: <strong>{kind}</strong>
        </p>
        {decision}
        {langPanel}
        <section className="home-section" aria-labelledby="human-heading-embed">
          <h2 id="human-heading-embed">Canonical human report</h2>
          <pre className="truth-report-pre" data-testid="verification-report-human">
            {humanText}
          </pre>
        </section>
        <section className="home-section" aria-labelledby="machine-heading-embed">
          <h2 id="machine-heading-embed">Machine JSON (integration SSOT)</h2>
          <pre className="truth-report-pre" data-testid="verification-report-machine">
            {machineJson}
          </pre>
        </section>
      </section>
    );
  }
  return (
    <article className="integrate-main" data-testid="verification-report-view">
      <h1>Verification report</h1>
      <p className="muted">{productCopy.publicShareReportIntro}</p>
      <p className="muted">
        Kind: <strong>{kind}</strong>
      </p>
      {decision}
      {langPanel}
      <section className="home-section" aria-labelledby="human-heading">
        <h2 id="human-heading">Canonical human report</h2>
        <pre className="truth-report-pre" data-testid="verification-report-human">
          {humanText}
        </pre>
      </section>
      <section className="home-section" aria-labelledby="machine-heading">
        <h2 id="machine-heading">Machine JSON (integration SSOT)</h2>
        <pre className="truth-report-pre" data-testid="verification-report-machine">
          {machineJson}
        </pre>
      </section>
    </article>
  );
}
