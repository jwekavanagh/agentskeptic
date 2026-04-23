import type Stripe from "stripe";
import type { PlanId } from "@/lib/plans";

export type BuildStripeCheckoutSessionCreateParamsInput = {
  stripeCustomerId: string | null | undefined;
  customerEmail: string;
  /** Flat recurring (monthly or annual) base price id. */
  baseRecurringPriceId: string;
  /** Per-verification overage (metered) price id; second subscription line item. */
  overagePriceId: string;
  baseUrl: string;
  plan: PlanId;
  userId: string;
};

/**
 * Pure params for `stripe.checkout.sessions.create`. Either `customer` or `customer_email`, never both.
 * Two `line_items`: base licensed recurring + metered overage.
 */
export function buildStripeCheckoutSessionCreateParams(
  input: BuildStripeCheckoutSessionCreateParamsInput,
): Stripe.Checkout.SessionCreateParams {
  const trimmedCustomerId =
    typeof input.stripeCustomerId === "string" ? input.stripeCustomerId.trim() : "";
  const base = input.baseUrl.replace(/\/$/, "");
  const success_url = `${base}/account?checkout=success&expectedPlan=${encodeURIComponent(input.plan)}`;
  const cancel_url = `${base}/pricing`;

  const common: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      { price: input.baseRecurringPriceId, quantity: 1 },
      { price: input.overagePriceId },
    ],
    success_url,
    cancel_url,
    metadata: {
      userId: input.userId,
      plan: input.plan,
    },
  };

  if (trimmedCustomerId.length > 0) {
    return {
      ...common,
      customer: trimmedCustomerId,
    };
  }

  return {
    ...common,
    customer_email: input.customerEmail,
  };
}
