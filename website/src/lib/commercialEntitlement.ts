import { paidEnforcementPlanIds, type PlanId } from "@/lib/plans";

export { paidEnforcementPlanIds };

export type SubscriptionStatusForEntitlement = "none" | "active" | "inactive";

export type ReserveIntent = "verify" | "enforce";

export type EntitlementDenyCode = "ENFORCEMENT_REQUIRES_PAID_PLAN" | "SUBSCRIPTION_INACTIVE";

export type EntitlementInput = {
  planId: PlanId;
  subscriptionStatus: SubscriptionStatusForEntitlement;
  intent: ReserveIntent;
  emergencyAllow: boolean;
};

export type EntitlementResult =
  | { proceedToQuota: true }
  | { proceedToQuota: false; denyCode: EntitlementDenyCode };

function isPaidEnforcementPlan(planId: PlanId): boolean {
  return (paidEnforcementPlanIds as readonly string[]).includes(planId);
}

/**
 * Pre-quota entitlement. Quota / idempotency are handled in the reserve route transaction.
 * Starter: verify proceeds to quota (free tier — included quota in `commercial-plans.json`); enforce remains paid-only.
 * Paid: verify and enforce need an active subscription (trialing counts as active in Stripe; mapped under subscriptionStatus in DB).
 */
export function resolveCommercialEntitlement(
  input: EntitlementInput,
): EntitlementResult {
  const { planId, subscriptionStatus, intent, emergencyAllow } = input;

  if (intent === "enforce" && planId === "starter") {
    return {
      proceedToQuota: false,
      denyCode: "ENFORCEMENT_REQUIRES_PAID_PLAN",
    };
  }

  if (intent === "verify" && planId === "starter") {
    return { proceedToQuota: true };
  }

  let effectiveActive = subscriptionStatus === "active";
  if (isPaidEnforcementPlan(planId) && emergencyAllow) {
    effectiveActive = true;
  }

  if (intent === "enforce" && isPaidEnforcementPlan(planId) && !effectiveActive) {
    return { proceedToQuota: false, denyCode: "SUBSCRIPTION_INACTIVE" };
  }

  if (intent === "verify" && isPaidEnforcementPlan(planId) && !effectiveActive) {
    return { proceedToQuota: false, denyCode: "SUBSCRIPTION_INACTIVE" };
  }

  return { proceedToQuota: true };
}
