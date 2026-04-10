import type Stripe from "stripe";

/**
 * Stripe → DB `user.subscription_status` (`none` | `active` | `inactive`).
 * - `active`, `trialing` → `active`
 * - `canceled`, `unpaid`, `past_due`, `incomplete_expired`, `incomplete`, `paused` → `inactive`
 */
export function subscriptionStatusFromStripe(
  status: Stripe.Subscription.Status,
): "active" | "inactive" {
  if (status === "active" || status === "trialing") return "active";
  return "inactive";
}
