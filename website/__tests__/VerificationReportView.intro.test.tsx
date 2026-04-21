/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VerificationReportView } from "@/components/VerificationReportView";
import { productCopy } from "@/content/productCopy";
import {
  derivedFieldsFromEnvelope,
  type PublicReportEnvelope,
} from "@/lib/publicVerificationReportService";

describe("VerificationReportView intro", () => {
  it("first muted paragraph is public share intro", () => {
    const cwd = process.cwd();
    const repoRoot = basename(cwd) === "website" ? join(cwd, "..") : cwd;
    const p = join(repoRoot, "website", "src", "content", "embeddedReports", "example-wf-complete.v1.json");
    const payload = JSON.parse(readFileSync(p, "utf8")) as PublicReportEnvelope;
    const { humanText } = derivedFieldsFromEnvelope(payload);
    render(<VerificationReportView humanText={humanText} payload={payload} variant="standalone" />);
    const muted = screen.getAllByText(productCopy.publicShareReportIntro);
    expect(muted.length).toBeGreaterThanOrEqual(1);
    const article = screen.getByTestId("verification-report-view");
    const firstMuted = article.querySelector("p.muted");
    expect(firstMuted?.textContent?.trim()).toBe(productCopy.publicShareReportIntro);
  });
});
