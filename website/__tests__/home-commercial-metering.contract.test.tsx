/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getHomeCommercialSectionFromConfig, getMeteringClarifier } from "@/lib/commercialNarrative";

describe("homepage commercial strip", () => {
  it("uses narrative lead, strip, and no raw GitHub URL in the strip (metering in lead)", () => {
    const section = getHomeCommercialSectionFromConfig();
    expect(section.lead).toBe(getMeteringClarifier());
    expect(section.strip).toContain("Starter includes");
    expect(section.strip).not.toMatch(/github\.com/i);
    render(
      <>
        <p data-testid="home-commercial-lead">{section.lead}</p>
        <p data-testid="home-commercial-metering">{section.strip}</p>
      </>,
    );
    expect(screen.getByTestId("home-commercial-metering")).toHaveTextContent("licensed");
  });
});
