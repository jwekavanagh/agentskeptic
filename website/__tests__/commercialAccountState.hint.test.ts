import {
  buildCommercialAccountStatePayload,
  emptyMonthlyQuotaForTests,
} from "@/lib/commercialAccountState";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("buildCommercialAccountStatePayload billingPriceSyncHint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is null when price maps", () => {
    vi.stubEnv("STRIPE_PRICE_INDIVIDUAL", "price_ok");
    const p = buildCommercialAccountStatePayload({
      plan: "individual",
      subscriptionStatus: "active",
      stripePriceId: "price_ok",
      expectedPlan: null,
      operatorContactEmail: "ops@example.com",
      monthlyQuota: emptyMonthlyQuotaForTests(),
    });
    expect(p.priceMapping).toBe("mapped");
    expect(p.billingPriceSyncHint).toBeNull();
  });

  it("returns support email when unmapped and operator email is valid", () => {
    vi.stubEnv("STRIPE_PRICE_INDIVIDUAL", "price_other");
    const p = buildCommercialAccountStatePayload({
      plan: "individual",
      subscriptionStatus: "active",
      stripePriceId: "price_on_subscription",
      expectedPlan: null,
      operatorContactEmail: "billing@example.com",
      monthlyQuota: emptyMonthlyQuotaForTests(),
    });
    expect(p.priceMapping).toBe("unmapped");
    expect(p.billingPriceSyncHint).toEqual({
      supportEmail: "billing@example.com",
    });
  });

  it("returns null supportEmail when operator contact is invalid", () => {
    const p = buildCommercialAccountStatePayload({
      plan: "individual",
      subscriptionStatus: "active",
      stripePriceId: "price_orphan",
      expectedPlan: null,
      operatorContactEmail: "not-an-email",
      monthlyQuota: emptyMonthlyQuotaForTests(),
    });
    expect(p.priceMapping).toBe("unmapped");
    expect(p.billingPriceSyncHint).toEqual({ supportEmail: null });
  });

  it("includes hint for starter when price is unmapped", () => {
    const p = buildCommercialAccountStatePayload({
      plan: "starter",
      subscriptionStatus: "active",
      stripePriceId: "price_orphan",
      expectedPlan: null,
      operatorContactEmail: "ops@example.com",
      monthlyQuota: emptyMonthlyQuotaForTests(),
    });
    expect(p.priceMapping).toBe("unmapped");
    expect(p.billingPriceSyncHint).toEqual({ supportEmail: "ops@example.com" });
  });
});
