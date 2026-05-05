/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import minimalEnvelope from "@/content/embeddedReports/minimal-share-v3-envelope.json";
import { VerificationReportView } from "@/components/VerificationReportView";
import {
  derivedFieldsFromEnvelope,
  type PublicReportEnvelope,
} from "@/lib/publicVerificationReportService";

describe("VerificationReportView human audit text independence", () => {
  afterEach(() => {
    cleanup();
  });

  it("executive summary unchanged when humanText and certificate audit prose are corrupted", () => {
    const payloadGood = structuredClone(minimalEnvelope) as unknown as PublicReportEnvelope;
    const { humanText: humanGood } = derivedFieldsFromEnvelope(payloadGood);

    const { unmount } = render(
      <VerificationReportView humanText={humanGood} payload={payloadGood} variant="standalone" />,
    );
    const v1 = screen.getByTestId("shared-report-verdict").textContent;
    const h1 = screen.getByTestId("shared-report-headline").textContent;
    const r1 = screen.getByTestId("shared-report-reason").textContent;
    const n1 = screen.getByTestId("shared-report-next-action").textContent;
    unmount();

    const payloadBad = structuredClone(minimalEnvelope) as { schemaVersion: 3; certificate: Record<string, unknown> };
    payloadBad.certificate.humanReport = "___WRONG_AUDIT_BODY___";

    render(
      <VerificationReportView
        humanText="___DECOUPLED_GARBAGE___"
        payload={payloadBad as unknown as PublicReportEnvelope}
        variant="standalone"
      />,
    );

    expect(screen.getByTestId("shared-report-verdict").textContent).toBe(v1);
    expect(screen.getByTestId("shared-report-headline").textContent).toBe(h1);
    expect(screen.getByTestId("shared-report-reason").textContent).toBe(r1);
    expect(screen.getByTestId("shared-report-next-action").textContent).toBe(n1);
    expect(screen.getByTestId("verification-report-human")).toHaveTextContent("___DECOUPLED_GARBAGE___");
  });
});
