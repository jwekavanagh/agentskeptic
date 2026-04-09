import Stripe from "stripe";

let stripe: Stripe | null = null;

/** Lazy Stripe client so `next build` does not require STRIPE_SECRET_KEY at module load. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  stripe ??= new Stripe(key);
  return stripe;
}
