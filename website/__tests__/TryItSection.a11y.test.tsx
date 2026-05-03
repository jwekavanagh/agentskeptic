/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerifyPageClient } from "@/app/verify/VerifyPageClient";
import { EXAMPLE_WF_MISSING_NDJSON } from "@/lib/verifyDefaultSample";

function mockFetch(implementation: (input: string, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(implementation) as unknown as typeof fetch);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("VerifyPageClient a11y", () => {
  it("disables run button while loading", async () => {
    mockFetch(
      () =>
        new Promise<Response>(() => {
          /* never resolves */
        }),
    );
    render(<VerifyPageClient />);
    const btn = screen.getByRole("button", { name: "Run verification" });
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
  });

  it("shows API errors in alert region", async () => {
    mockFetch(
      async () =>
        new Response(JSON.stringify({ ok: false, error: "VERIFY_ENGINE_FAILED" }), {
          status: 500,
          headers: { "x-request-id": "test-req-1" },
        }),
    );
    render(<VerifyPageClient />);
    fireEvent.click(screen.getByRole("button", { name: "Run verification" }));
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Verification failed");
      expect(alert).toHaveTextContent("Request ID:");
      expect(alert).toHaveTextContent("test-req-1");
    });
  });

  it("renders contradiction headline on successful default response", async () => {
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            workflowId: "wf_missing",
            humanReport: "ROW_ABSENT: expected row is missing.",
            certificate: {
              stateRelation: "does_not_match",
              explanation: { headline: "Expected row is missing.", details: [{ code: "ROW_ABSENT" }] },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    render(<VerifyPageClient />);
    expect(screen.getByLabelText("Verification events NDJSON")).toHaveValue(EXAMPLE_WF_MISSING_NDJSON);
    fireEvent.click(screen.getByRole("button", { name: "Run verification" }));
    await waitFor(() => {
      expect(screen.getByText("Reality contradicts the claim")).toBeInTheDocument();
      expect(screen.getByText("Expected row is missing.")).toBeInTheDocument();
    });
  });
});
