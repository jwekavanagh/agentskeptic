/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountClient } from "@/app/account/AccountClient";
import type { CommercialAccountStatePayload } from "@/lib/commercialAccountState";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: function MockLink({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

afterEach(() => {
  cleanup();
});

function baseCommercial(overrides: Partial<CommercialAccountStatePayload> = {}): CommercialAccountStatePayload {
  return {
    plan: "individual",
    subscriptionStatus: "inactive",
    priceMapping: "mapped",
    entitlementSummary: "Licensed verification (npm) needs an active subscription.",
    checkoutActivationReady: false,
    ...overrides,
  };
}

describe("AccountClient inactive subscription", () => {
  it("shows recovery notice and pricing link", () => {
    render(<AccountClient hasKey={false} initialCommercial={baseCommercial()} />);

    const notice = screen.getByTestId("inactive-subscription-notice");
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(/not active/i);
    expect(notice).toHaveTextContent(/licensed verification and enforcement are paused/i);

    const pricing = screen.getByRole("link", { name: /view pricing and subscribe/i });
    expect(pricing).toHaveAttribute("href", "/pricing");
  });

  it("does not show inactive notice when subscription is active", () => {
    render(
      <AccountClient
        hasKey={false}
        initialCommercial={baseCommercial({ subscriptionStatus: "active" })}
      />,
    );
    expect(screen.queryByTestId("inactive-subscription-notice")).not.toBeInTheDocument();
  });
});
