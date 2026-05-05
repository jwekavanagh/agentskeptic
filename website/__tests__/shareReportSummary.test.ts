import { describe, expect, it } from "vitest";
import minimalEnvelope from "@/content/embeddedReports/minimal-share-v3-envelope.json";
import trustedEnvelope from "@/content/embeddedReports/minimal-share-v3-trusted.json";
import unknownEnvelope from "@/content/embeddedReports/minimal-share-v3-unknown.json";
import { executiveSummaryFromCertificate } from "@/lib/shareReportSummary";
import {
  SHARED_REPORT_HEADLINE_FALLBACK,
  SHARED_REPORT_NEXT_FALLBACK_NON_TRUSTED,
  SHARED_REPORT_NEXT_TRUSTED,
  SHARED_REPORT_REASON_FALLBACK,
  SHARED_REPORT_VERDICT_NOT_TRUSTED,
  SHARED_REPORT_VERDICT_TRUSTED,
  SHARED_REPORT_VERDICT_UNKNOWN,
} from "@/lib/shareReportFallbacks";
import type { CertificateForExecutiveSummary } from "@/lib/shareReportSummary";

describe("executiveSummaryFromCertificate", () => {
  it("matrix A: not_trusted + fixture headline/reason/next", () => {
    const cert = minimalEnvelope.certificate as CertificateForExecutiveSummary;
    const m = executiveSummaryFromCertificate(cert);
    expect(m.verdictLabel).toBe(SHARED_REPORT_VERDICT_NOT_TRUSTED);
    expect(m.headline).toBe("Fixture headline for share POST v2");
    expect(m.reason).toBe("ROW_ABSENT: Expected row is missing.");
    expect(m.nextAction).toBe(
      "Review the evidence completeness block and workflow truth report, then decide on a manual fix path.",
    );
  });

  it("matrix B: trusted + NEXT_TRUSTED constant", () => {
    const cert = trustedEnvelope.certificate as CertificateForExecutiveSummary;
    const m = executiveSummaryFromCertificate(cert);
    expect(m.verdictLabel).toBe(SHARED_REPORT_VERDICT_TRUSTED);
    expect(m.headline).toBe("Fixture trusted headline");
    expect(m.reason).toBe("TRUSTED: Fixture trusted summary.");
    expect(m.nextAction).toBe(SHARED_REPORT_NEXT_TRUSTED);
  });

  it("matrix C: unknown + fallback next", () => {
    const cert = unknownEnvelope.certificate as CertificateForExecutiveSummary;
    const m = executiveSummaryFromCertificate(cert);
    expect(m.verdictLabel).toBe(SHARED_REPORT_VERDICT_UNKNOWN);
    expect(m.headline).toBe("Fixture unknown headline");
    expect(m.reason).toBe("INCOMPLETE_FIXTURE: Registry or capture incomplete.");
    expect(m.nextAction).toBe(SHARED_REPORT_NEXT_FALLBACK_NON_TRUSTED);
  });

  it("fallbacks when explanation empty and spine empty", () => {
    const cert = {
      ...((trustedEnvelope.certificate as CertificateForExecutiveSummary)),
      explanation: { headline: "", details: [] },
      failureSpine: {
        ...(trustedEnvelope.certificate as CertificateForExecutiveSummary).failureSpine,
        summary: "",
      },
      intentSummary: "",
    };
    const m = executiveSummaryFromCertificate(cert as CertificateForExecutiveSummary);
    expect(m.headline).toBe(SHARED_REPORT_HEADLINE_FALLBACK);
    expect(m.reason).toBe(SHARED_REPORT_REASON_FALLBACK);
  });
});
