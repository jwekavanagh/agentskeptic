import { describe, expect, it } from "vitest";
import {
  computeAllowedNext,
  computeOverageCount,
  computeQuotaState,
  estimateOverageUsd,
} from "@/lib/quotaPolicy";

describe("quotaPolicy", () => {
  it("computes overage and at-cap behavior for hard cap plans", () => {
    expect(
      computeOverageCount({ usedTotal: 1200, includedMonthly: 1000, allowOverage: false }),
    ).toBe(200);
    expect(
      computeAllowedNext({ usedTotal: 1000, includedMonthly: 1000, allowOverage: false }),
    ).toBe(false);
    expect(
      computeQuotaState({ usedTotal: 1000, includedMonthly: 1000, allowOverage: false }),
    ).toBe("at_cap");
  });

  it("computes in_overage behavior when overage is allowed", () => {
    expect(
      computeAllowedNext({ usedTotal: 1000, includedMonthly: 1000, allowOverage: true }),
    ).toBe(true);
    expect(
      computeQuotaState({ usedTotal: 1200, includedMonthly: 1000, allowOverage: true }),
    ).toBe("in_overage");
  });

  it("estimates USD from microusd rate", () => {
    expect(
      estimateOverageUsd({ overageCount: 2000, overageMicrousdPerVerification: 12000 }),
    ).toBe("24.00");
  });
});

