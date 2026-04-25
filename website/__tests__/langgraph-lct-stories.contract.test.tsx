// @vitest-environment jsdom

import { LangGraphCheckpointTrustStories } from "@/components/examples/LangGraphCheckpointTrustStories";
import a2 from "@/content/embeddedReports/langgraph-lct-a2-ineligible.v1.json";
import b from "@/content/embeddedReports/langgraph-lct-b-verified.v1.json";
import c from "@/content/embeddedReports/langgraph-lct-c-mismatch.v1.json";
import d from "@/content/embeddedReports/langgraph-lct-d-incomplete.v1.json";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("langgraph LCT example tabs (contract)", () => {
  afterEach(() => {
    cleanup();
  });

  it("each tab shows machine JSON matching the committed OutcomeCertificate fixture", () => {
    const table: { testId: string; fixture: unknown }[] = [
      { testId: "langgraph-lct-tab-a2", fixture: a2 },
      { testId: "langgraph-lct-tab-b", fixture: b },
      { testId: "langgraph-lct-tab-c", fixture: c },
      { testId: "langgraph-lct-tab-d", fixture: d },
    ];

    render(<LangGraphCheckpointTrustStories />);
    for (const row of table) {
      fireEvent.click(screen.getByTestId(row.testId));
      const embed = screen.getByTestId("verification-report-embed");
      const pre = within(embed).getByTestId("verification-report-machine");
      const parsed = JSON.parse((pre.textContent ?? "").trim());
      expect(parsed).toEqual(row.fixture);
    }
  });
});
