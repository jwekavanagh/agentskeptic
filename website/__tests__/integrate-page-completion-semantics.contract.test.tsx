// @vitest-environment jsdom

import IntegratePage from "@/app/integrate/page";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/** Expected accessible names — literals live only here (v2 /integrate layout). */
const EXPECT_SCAFFOLD_H2 = "Scaffold then verify (canonical v2 path)";
const EXPECT_PRODUCT_WIRE_H2 = "Product completion: wire your emitters";

const FORBIDDEN_IN_MAIN = [
  "What success looks like",
  "successHeading",
  "IntegrateSpineComplete alone satisfies Decision-ready ProductionComplete",
];

vi.mock("@/components/FunnelSurfaceBeacon", () => ({
  FunnelSurfaceBeacon: () => null,
}));

describe("/integrate completion semantics (RTL)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("scaffold+verify is primary h2; wire emitters h2; framework spine section contains activation; main omits forbidden phrases", () => {
    const { container } = render(<IntegratePage />);
    const main = screen.getByRole("main");
    const h2s = within(main).getAllByRole("heading", { level: 2 });
    expect(h2s[0]?.textContent).toBe(EXPECT_SCAFFOLD_H2);
    expect(within(main).getByRole("heading", { level: 2, name: EXPECT_PRODUCT_WIRE_H2 })).toBeTruthy();
    expect(within(main).queryByRole("heading", { level: 2, name: "Mechanical spine checkpoint (not product completion)" })).toBeNull();

    const spine = container.querySelector("section.integrate-optional-spine");
    expect(spine).toBeTruthy();
    const activation = container.querySelector('[data-testid="integrator-activation-commands"]');
    expect(activation).toBeTruthy();
    expect(spine?.contains(activation)).toBe(true);

    const aggregate = main.textContent ?? "";
    for (const bad of FORBIDDEN_IN_MAIN) {
      expect(aggregate.includes(bad)).toBe(false);
    }
    expect(container.querySelector('[data-testid="integrate-crossing-commands"]')).toBeTruthy();
    const guided = container.querySelector('[data-testid="integrate-guided-link"]');
    expect(guided).toBeTruthy();
    expect((guided as HTMLAnchorElement).getAttribute("href")).toBe("/integrate/guided");
  });
});
