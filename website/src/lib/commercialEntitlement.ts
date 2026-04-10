import { paidEnforcementPlanIds, type PlanId } from "@/lib/plans";

export { paidEnforcementPlanIds };

export type SubscriptionStatusForEntitlement = "none" | "active" | "inactive";

export type ReserveIntent = "verify" | "enforce";

export type EntitlementDenyCode =
  | "ENFORCEMENT_REQUIRES_PAID_PLAN"
  | "SUBSCRIPTION_INACTIVE"
  | "VERIFICATION_REQUIRES_SUBSCRIPTION";

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
 * Pre-quota entitlement only. Quota / idempotency are handled in the reserve route transaction.
 * Commercial npm verify and enforce both require an active subscription on paid-capable plans;
 * Starter cannot use licensed verify or enforce.
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
    return {
      proceedToQuota: false,
      denyCode: "VERIFICATION_REQUIRES_SUBSCRIPTION",
    };
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
