import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/apiKeyAuthGateway", () => ({
  authenticateApiKey: vi.fn(),
  requireScopes: vi.fn(),
}));

vi.mock("@/lib/plans", () => ({
  loadCommercialPlans: () => ({
    schemaVersion: 2,
    recommendedPlanId: "team",
    plans: {
      starter: { includedMonthly: 1000, allowOverage: false },
      individual: { includedMonthly: 5000, allowOverage: true },
      team: { includedMonthly: 20000, allowOverage: true },
      business: { includedMonthly: 100000, allowOverage: true },
      enterprise: { includedMonthly: null, allowOverage: false },
    },
  }),
}));

vi.mock("@/lib/usageSnapshot", () => ({
  loadUsageSnapshotForUser: vi.fn(async () => ({
    schema_version: 1,
    plan: "team",
    year_month: "2026-04",
    period_start_utc: "2026-04-01T00:00:00.000Z",
    period_end_utc: "2026-05-01T00:00:00.000Z",
    used_total: 22000,
    included_monthly: 20000,
    allow_overage: true,
    overage_count: 2000,
    quota_state: "in_overage",
    allowed_next: true,
    estimated_overage_usd: "24.00",
  })),
}));

import { authenticateApiKey, requireScopes } from "@/lib/apiKeyAuthGateway";
import { GET } from "@/app/api/v1/usage/current/route";

describe("GET /api/v1/usage/current", () => {
  it("returns usage snapshot for authenticated meter-scoped principal", async () => {
    const authMock = vi.mocked(authenticateApiKey);
    const scopeMock = vi.mocked(requireScopes);
    authMock.mockResolvedValue({
      ok: true,
      principal: {
        userId: "u1",
        keyId: "k1",
        source: "v2",
        label: "x",
        scopes: ["meter"],
        status: "active",
        user: { plan: "team", subscriptionStatus: "active", stripePriceId: null },
      },
    } as never);
    scopeMock.mockReturnValue({ ok: true } as never);

    const res = await GET(new NextRequest("http://localhost/api/v1/usage/current"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan).toBe("team");
    expect(body.used_total).toBe(22000);
    expect(body.estimated_overage_usd).toBe("24.00");
  });
});

