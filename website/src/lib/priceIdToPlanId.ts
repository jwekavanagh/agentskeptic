import { loadCommercialPlans, type PlanId } from "@/lib/plans";

/**
 * Parse `STRIPE_PRICE_*` values: one id, or several separated by comma and/or whitespace.
 * Order is preserved; the first id is the default used for new Checkout sessions.
 */
export function stripePriceEnvCandidates(raw: string | undefined | null): string[] {
  if (raw === undefined || raw === null) return [];
  const s = raw.trim();
  if (s === "") return [];
  return s.split(/[\s,]+/).filter((x) => x.length > 0);
}

/** First configured price id for a plan env key (Checkout default line item). */
export function checkoutStripePriceFromEnvKey(envKey: string): string | null {
  const candidates = stripePriceEnvCandidates(process.env[envKey]);
  return candidates[0] ?? null;
}

/**
 * Map Stripe Price id → commercial `PlanId` using env keys from `config/commercial-plans.json`.
 */
export function priceIdToPlanId(priceId: string | null | undefined): PlanId | null {
  const normalized = priceId?.trim();
  if (!normalized) return null;
  const plans = loadCommercialPlans();
  for (const planId of Object.keys(plans.plans) as PlanId[]) {
    const def = plans.plans[planId];
    const key = def.stripePriceEnvKey;
    if (!key) continue;
    const candidates = stripePriceEnvCandidates(process.env[key]);
    if (candidates.includes(normalized)) return planId;
  }
  return null;
}

/**
 * Primary recurring price id from a Stripe Subscription object.
 */
export function primarySubscriptionPriceId(sub: {
  items?: { data?: Array<{ price?: { id?: string } | string | null }> };
}): string | null {
  const item0 = sub.items?.data?.[0];
  if (!item0?.price) return null;
  const p = item0.price;
  return typeof p === "string" ? p : (p.id ?? null);
}
