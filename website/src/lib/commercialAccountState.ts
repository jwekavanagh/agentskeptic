import {
  loadMonthlyQuotaForUser,
  type MonthlyQuotaKeyRow,
} from "@/lib/accountMonthlyQuota";
import {
  getAccountEntitlementSummary,
  type PriceMapping,
} from "@/lib/accountEntitlementSummary";
import {
  resolveCommercialEntitlement,
  type SubscriptionStatusForEntitlement,
} from "@/lib/commercialEntitlement";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { loadCommercialPlans, type PlanId } from "@/lib/plans";
import { priceIdToPlanId } from "@/lib/priceIdToPlanId";
import { eq } from "drizzle-orm";

function bareSupportEmail(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export function normalizeSubscriptionStatusForAccount(
  raw: string | null | undefined,
): SubscriptionStatusForEntitlement {
  if (raw === "none" || raw === "active" || raw === "inactive") return raw;
  return "none";
}

const CHECKOUT_EXPECTED_PLANS: readonly PlanId[] = ["individual", "team", "business"];

export function parseExpectedPlanQuery(raw: string | null): PlanId | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw.trim());
  return CHECKOUT_EXPECTED_PLANS.includes(decoded as PlanId) ? (decoded as PlanId) : null;
}

/** True when the query param is present but not a valid self-serve checkout plan. */
export function isInvalidExpectedPlanQuery(raw: string | null): boolean {
  if (raw === null || raw === "") return false;
  return parseExpectedPlanQuery(raw) === null;
}

export function computePriceMapping(stripePriceId: string | null | undefined): PriceMapping {
  if (!stripePriceId) return "mapped";
  return priceIdToPlanId(stripePriceId) === null ? "unmapped" : "mapped";
}

export function computeCheckoutActivationReady(input: {
  expectedPlan: PlanId | null;
  plan: PlanId;
  subscriptionStatus: SubscriptionStatusForEntitlement;
  priceMapping: PriceMapping;
}): boolean {
  const { expectedPlan, plan, subscriptionStatus, priceMapping } = input;
  if (!expectedPlan) return false;
  if (plan !== expectedPlan) return false;
  if (subscriptionStatus !== "active") return false;
  if (priceMapping !== "mapped") return false;
  const verify = resolveCommercialEntitlement({
    planId: plan,
    subscriptionStatus,
    intent: "verify",
    emergencyAllow: false,
  });
  return verify.proceedToQuota === true;
}

/** Shown when `priceMapping` is `unmapped` (customer-facing support only; no deployment internals). */
export type BillingPriceSyncHint = {
  supportEmail: string | null;
};

export type QuotaUrgency = "ok" | "notice" | "warning" | "in_overage" | "at_cap";

export type MonthlyQuotaPayload = {
  yearMonth: string;
  keys: MonthlyQuotaKeyRow[];
  distinctReserveUtcDaysThisMonth: number;
  worstUrgency: QuotaUrgency;
  totalOverageVerifications: number;
  overageProjectedLine: string | null;
  overageUpgradeNudge: string | null;
};

export type CommercialAccountStatePayload = {
  plan: PlanId;
  subscriptionStatus: SubscriptionStatusForEntitlement;
  priceMapping: PriceMapping;
  entitlementSummary: string;
  checkoutActivationReady: boolean;
  /** True when `user.stripe_customer_id` is set; drives Billing Portal entry control. */
  hasStripeCustomer: boolean;
  /** Present only when the subscription price is not recognized for plan mapping (customer support CTA). */
  billingPriceSyncHint: BillingPriceSyncHint | null;
  monthlyQuota: MonthlyQuotaPayload;
};

/** Stable empty quota for unit tests that only assert billing hints. */
export function emptyMonthlyQuotaForTests(): MonthlyQuotaPayload {
  const yearMonth = new Date().toISOString().slice(0, 7);
  return {
    yearMonth,
    keys: [],
    distinctReserveUtcDaysThisMonth: 0,
    worstUrgency: "ok",
    totalOverageVerifications: 0,
    overageProjectedLine: null,
    overageUpgradeNudge: null,
  };
}

const rank: Record<QuotaUrgency, number> = {
  ok: 0,
  notice: 1,
  warning: 2,
  in_overage: 3,
  at_cap: 4,
};

export function computeWorstUrgency(
  keys: MonthlyQuotaKeyRow[],
  allowOverage: boolean,
): QuotaUrgency {
  if (keys.length === 0) {
    return "ok";
  }
  let best: QuotaUrgency = "ok";
  for (const k of keys) {
    if (k.limit === null) {
      continue;
    }
    const L = k.limit;
    let s: QuotaUrgency = "ok";
    if (k.overageOnKey > 0) {
      s = "in_overage";
    } else if (k.used >= L && !allowOverage) {
      s = "at_cap";
    } else if (k.used >= L && allowOverage) {
      s = "warning";
    } else if (k.used >= Math.ceil(0.9 * L)) {
      s = "warning";
    } else if (k.used >= Math.ceil(0.75 * L)) {
      s = "notice";
    }
    if (rank[s] > rank[best]) {
      best = s;
    }
  }
  return best;
}

export function computeHasStripeCustomer(stripeCustomerId: string | null | undefined): boolean {
  return typeof stripeCustomerId === "string" && stripeCustomerId.trim().length > 0;
}

export function buildCommercialAccountStatePayload(input: {
  plan: PlanId;
  subscriptionStatus: SubscriptionStatusForEntitlement;
  stripePriceId: string | null | undefined;
  stripeCustomerId?: string | null;
  expectedPlan: PlanId | null;
  operatorContactEmail?: string | null;
  monthlyQuota: MonthlyQuotaPayload;
}): CommercialAccountStatePayload {
  const {
    plan,
    subscriptionStatus,
    stripePriceId,
    stripeCustomerId,
    expectedPlan,
    operatorContactEmail,
    monthlyQuota,
  } = input;
  const hasStripeCustomer = computeHasStripeCustomer(stripeCustomerId);
  const priceMapping = computePriceMapping(stripePriceId);
  const entitlementSummary = getAccountEntitlementSummary({
    planId: plan,
    subscriptionStatus,
    priceMapping,
    operatorContactEmail,
  });
  const checkoutActivationReady = computeCheckoutActivationReady({
    expectedPlan,
    plan,
    subscriptionStatus,
    priceMapping,
  });

  let billingPriceSyncHint: BillingPriceSyncHint | null = null;
  if (priceMapping === "unmapped") {
    billingPriceSyncHint = {
      supportEmail: bareSupportEmail(operatorContactEmail),
    };
  }

  return {
    plan,
    subscriptionStatus,
    priceMapping,
    entitlementSummary,
    checkoutActivationReady,
    hasStripeCustomer,
    billingPriceSyncHint,
    monthlyQuota,
  };
}

export type AssembleCommercialAccountStateInput = {
  userId: string;
  expectedPlan: PlanId | null;
  operatorContactEmail?: string | null;
};

export async function assembleCommercialAccountState(
  input: AssembleCommercialAccountStateInput,
): Promise<CommercialAccountStatePayload> {
  const [row] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!row) {
    throw new Error("assembleCommercialAccountState: user not found");
  }
  const plan = row.plan as PlanId;
  const subscriptionStatus = normalizeSubscriptionStatusForAccount(row.subscriptionStatus);
  const quotaBlock = await loadMonthlyQuotaForUser(input.userId, plan);
  const planDef = loadCommercialPlans().plans[plan];
  const allowOverage = planDef?.allowOverage === true;
  const worstUrgency = computeWorstUrgency(quotaBlock.keys, allowOverage);
  return buildCommercialAccountStatePayload({
    plan,
    subscriptionStatus,
    stripePriceId: row.stripePriceId,
    stripeCustomerId: row.stripeCustomerId,
    expectedPlan: input.expectedPlan,
    operatorContactEmail: input.operatorContactEmail,
    monthlyQuota: {
      yearMonth: quotaBlock.yearMonth,
      keys: quotaBlock.keys,
      distinctReserveUtcDaysThisMonth: quotaBlock.distinctReserveUtcDaysThisMonth,
      worstUrgency,
      totalOverageVerifications: quotaBlock.totalOverageVerifications,
      overageProjectedLine: quotaBlock.overageProjectedLine,
      overageUpgradeNudge: quotaBlock.overageUpgradeNudge,
    },
  });
}
