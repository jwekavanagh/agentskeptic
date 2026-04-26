import { and, eq, inArray, isNull, sum } from "drizzle-orm";
import { db } from "@/db/client";
import { apiKeys, usageCounters } from "@/db/schema";
import type { PlanId } from "@/lib/plans";
import { loadCommercialPlans } from "@/lib/plans";
import { usageCurrentV1Schema, type UsageCurrentV1 } from "@/lib/contracts/usageCurrent";
import {
  computeAllowedNext,
  computeOverageCount,
  computeQuotaState,
  estimateOverageUsd,
  validatePlanDefinition,
} from "@/lib/quotaPolicy";

export async function loadUsageSnapshotForUser(input: {
  userId: string;
  planId: PlanId;
  yearMonth?: string;
}): Promise<UsageCurrentV1> {
  const plans = loadCommercialPlans();
  const def = plans.plans[input.planId];
  if (!validatePlanDefinition(def)) {
    throw new Error("PLANS_UNAVAILABLE");
  }

  const yearMonth = input.yearMonth ?? new Date().toISOString().slice(0, 7);
  const [yStr, mStr] = yearMonth.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

  const keyRows = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, input.userId), isNull(apiKeys.revokedAt)));
  const keyIds = keyRows.map((r) => r.id);

  let usedTotal = 0;
  if (keyIds.length > 0) {
    const [row] = await db
      .select({ t: sum(usageCounters.count) })
      .from(usageCounters)
      .where(and(inArray(usageCounters.apiKeyId, keyIds), eq(usageCounters.yearMonth, yearMonth)));
    usedTotal = Number(row?.t ?? 0);
  }

  const includedMonthly = def.includedMonthly;
  const allowOverage = def.allowOverage === true;
  const overageCount = computeOverageCount({ usedTotal, includedMonthly, allowOverage });
  const quotaState = computeQuotaState({ usedTotal, includedMonthly, allowOverage });
  const allowedNext = computeAllowedNext({ usedTotal, includedMonthly, allowOverage });

  const payload: UsageCurrentV1 = {
    schema_version: 1,
    plan: input.planId,
    year_month: yearMonth,
    period_start_utc: start.toISOString(),
    period_end_utc: end.toISOString(),
    used_total: usedTotal,
    included_monthly: includedMonthly,
    allow_overage: allowOverage,
    overage_count: overageCount,
    quota_state: quotaState,
    allowed_next: allowedNext,
    estimated_overage_usd: estimateOverageUsd({
      overageCount,
      overageMicrousdPerVerification: def.overageMicrousdPerVerification,
    }),
  };

  return usageCurrentV1Schema.parse(payload);
}

