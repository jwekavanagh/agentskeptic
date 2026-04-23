import { db } from "@/db/client";
import { apiKeys, usageCounters } from "@/db/schema";
import { countDistinctReserveUtcDaysForUserInMonth } from "@/lib/funnelObservabilityQueries";
import { loadCommercialPlans } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { and, eq, isNull } from "drizzle-orm";

export type MonthlyQuotaKeyRow = {
  apiKeyId: string;
  label: string;
  used: number;
  /** `null` means unlimited (enterprise). */
  limit: number | null;
  /** Overage units on this key when `used > limit` and plan allows overage. */
  overageOnKey: number;
};

export type MonthlyQuotaBlock = {
  yearMonth: string;
  keys: MonthlyQuotaKeyRow[];
  distinctReserveUtcDaysThisMonth: number;
  /**
   * Sum of `overageOnKey` across keys; 0 on Starter or when under included.
   */
  totalOverageVerifications: number;
  /**
   * Human-readable; null when not on a metered-overage plan or no overage.
   */
  overageProjectedLine: string | null;
  /** Next-tier savings nudge when in overage (static copy; optional). */
  overageUpgradeNudge: string | null;
};

function ymNowUtc(): string {
  return new Date().toISOString().slice(0, 7);
}

function usdFromMicrousd(microusd: number): string {
  const d = microusd / 1_000_000;
  if (!Number.isFinite(d)) return "—";
  return d < 0.01 ? d.toFixed(4) : d.toFixed(2);
}

export async function loadMonthlyQuotaForUser(
  userId: string,
  planId: PlanId,
): Promise<MonthlyQuotaBlock> {
  const yearMonth = ymNowUtc();
  const plans = loadCommercialPlans();
  const planDef = plans.plans[planId];
  const limit =
    planDef?.includedMonthly === null || planDef?.includedMonthly === undefined
      ? null
      : planDef.includedMonthly;

  const keys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  const keyRows: MonthlyQuotaKeyRow[] = [];
  for (const k of keys) {
    const [c] = await db
      .select()
      .from(usageCounters)
      .where(and(eq(usageCounters.apiKeyId, k.id), eq(usageCounters.yearMonth, yearMonth)))
      .limit(1);
    const used = Number(c?.count ?? 0);
    const L = limit;
    const overageOnKey =
      L === null || !planDef?.allowOverage ? 0 : Math.max(0, used - L);
    keyRows.push({
      apiKeyId: k.id,
      label: "API key",
      used,
      limit: L,
      overageOnKey,
    });
  }

  const distinctReserveUtcDaysThisMonth = await countDistinctReserveUtcDaysForUserInMonth(
    userId,
    yearMonth,
  );

  const totalOverageVerifications = keyRows.reduce((s, r) => s + r.overageOnKey, 0);

  let overageProjectedLine: string | null = null;
  let overageUpgradeNudge: string | null = null;
  const mic = planDef?.overageMicrousdPerVerification;
  if (planDef?.allowOverage === true && mic && totalOverageVerifications > 0) {
    const projectedMicroUsd = totalOverageVerifications * mic;
    overageProjectedLine = `Overage this month: ${totalOverageVerifications.toLocaleString()} verifications past included; estimated add-on (before tax) ~$${usdFromMicrousd(projectedMicroUsd)} at your plan’s overage rate. Final amount appears on your Stripe invoice.`;
    if (planId === "individual") {
      overageUpgradeNudge =
        "If overage is persistent, a higher plan often lowers the effective $/verification—compare Team on Pricing.";
    } else if (planId === "team") {
      overageUpgradeNudge =
        "If overage is persistent, consider Business for a larger included pool and lower per-unit overage—see Pricing.";
    }
  }

  return {
    yearMonth,
    keys: keyRows,
    distinctReserveUtcDaysThisMonth,
    totalOverageVerifications,
    overageProjectedLine,
    overageUpgradeNudge,
  };
}
