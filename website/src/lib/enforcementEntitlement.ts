import { resolveCommercialEntitlement, type SubscriptionStatusForEntitlement } from "@/lib/commercialEntitlement";
import type { PlanId } from "@/lib/plans";

function normalizeSubscriptionStatus(raw: string): SubscriptionStatusForEntitlement | null {
  if (raw === "none" || raw === "active" || raw === "inactive") return raw;
  return null;
}

export function canUseStatefulEnforcement(input: {
  plan: string;
  subscriptionStatus: string;
}): { ok: true } | { ok: false; code: "ENFORCEMENT_REQUIRES_PAID_PLAN" | "SUBSCRIPTION_INACTIVE" } {
  const sub = normalizeSubscriptionStatus(input.subscriptionStatus);
  if (sub === null) {
    return { ok: false, code: "SUBSCRIPTION_INACTIVE" };
  }
  const ent = resolveCommercialEntitlement({
    planId: input.plan as PlanId,
    subscriptionStatus: sub,
    intent: "enforce",
    emergencyAllow: process.env.RESERVE_EMERGENCY_ALLOW === "1",
  });
  if (!ent.proceedToQuota) return { ok: false, code: ent.denyCode };
  return { ok: true };
}

