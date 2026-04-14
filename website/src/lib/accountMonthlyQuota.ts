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
};

export type MonthlyQuotaBlock = {
  yearMonth: string;
  keys: MonthlyQuotaKeyRow[];
  distinctReserveUtcDaysThisMonth: number;
};

function ymNowUtc(): string {
  return new Date().toISOString().slice(0, 7);
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
    keyRows.push({
      apiKeyId: k.id,
      label: "API key",
      used: Number(c?.count ?? 0),
      limit,
    });
  }

  const distinctReserveUtcDaysThisMonth = await countDistinctReserveUtcDaysForUserInMonth(
    userId,
    yearMonth,
  );

  return { yearMonth, keys: keyRows, distinctReserveUtcDaysThisMonth };
}
