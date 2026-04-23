import { auth } from "@/auth";
import { db } from "@/db/client";
import { funnelEvents, users } from "@/db/schema";
import {
  buildCheckoutStartedMetadata,
  type CheckoutStartedMetadata,
} from "@/lib/funnelCommercialMetadata";
import { logFunnelEvent } from "@/lib/funnelEvent";
import { loadCommercialPlans, planHasSelfServeCheckout, type PlanId } from "@/lib/plans";
import { getCanonicalSiteOrigin } from "@/lib/canonicalSiteOrigin";
import { checkoutBasePriceIdForInterval, checkoutOveragePriceId } from "@/lib/priceIdToPlanId";
import { isStripeMissingCustomerError } from "@/lib/stripeMissingCustomerError";
import { buildStripeCheckoutSessionCreateParams } from "@/lib/stripeCheckoutSessionParams";
import { getStripe } from "@/lib/stripeServer";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export type CheckoutBillingInterval = "monthly" | "yearly";

function parseBody(raw: unknown): { plan: PlanId; interval: CheckoutBillingInterval } | null {
  if (!raw || typeof raw !== "object") return null;
  const p = (raw as { plan?: unknown; interval?: unknown }).plan;
  const intervalRaw = (raw as { interval?: unknown }).interval;
  if (typeof p !== "string") return null;
  const plans = loadCommercialPlans();
  if (!plans.plans[p as PlanId]) return null;
  const interval: CheckoutBillingInterval =
    intervalRaw === "yearly" ? "yearly" : "monthly";
  return { plan: p as PlanId, interval };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const customerEmail = session.user.email;

  let plan: PlanId;
  let billingInterval: CheckoutBillingInterval;
  try {
    const j = (await req.json()) as unknown;
    const parsed = parseBody(j);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const plans = loadCommercialPlans();
    const def = plans.plans[parsed.plan];
    if (!def || !planHasSelfServeCheckout(def)) {
      return NextResponse.json({ error: "Plan not billable" }, { status: 400 });
    }
    if (parsed.interval === "yearly" && def.stripePriceEnvKeyYearly === null) {
      return NextResponse.json({ error: "Annual checkout not available for this plan" }, { status: 400 });
    }
    plan = parsed.plan;
    billingInterval = parsed.interval;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const basePrice = checkoutBasePriceIdForInterval(plan, billingInterval);
  if (basePrice.priceId === null) {
    return NextResponse.json(
      {
        error: "CONFIG",
        message:
          basePrice.envKey && basePrice.error === "not_configured"
            ? `Missing Stripe base price: set process.env.${basePrice.envKey} to a Price id.`
            : "Missing Stripe base price for this plan.",
      },
      { status: 500 },
    );
  }

  const over = checkoutOveragePriceId(plan);
  if (!over.priceId || !over.envKey) {
    return NextResponse.json(
      {
        error: "CONFIG",
        message: "Missing overage (metered) Stripe price. Set the STRIPE_OVERAGE_* environment variable for this plan.",
      },
      { status: 500 },
    );
  }

  const base = getCanonicalSiteOrigin();

  const [urow] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const trimmedStoredCustomerId =
    typeof urow?.stripeCustomerId === "string" ? urow.stripeCustomerId.trim() : "";

  const priorReserve = await db
    .select()
    .from(funnelEvents)
    .where(
      and(eq(funnelEvents.userId, userId), eq(funnelEvents.event, "reserve_allowed")),
    )
    .limit(1);
  const postActivation = priorReserve.length > 0;

  const sessionParams = buildStripeCheckoutSessionCreateParams({
    stripeCustomerId: urow?.stripeCustomerId,
    customerEmail,
    baseRecurringPriceId: basePrice.priceId,
    overagePriceId: over.priceId,
    baseUrl: base,
    plan,
    userId,
  });

  const stripe = getStripe();

  async function createCheckoutAndRespond(
    params: Stripe.Checkout.SessionCreateParams,
  ): Promise<NextResponse> {
    const checkout = await stripe.checkout.sessions.create(params);
    const url = checkout.url;
    if (!url) {
      return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 502 });
    }

    await logFunnelEvent({
      event: "checkout_started",
      userId,
      metadata: buildCheckoutStartedMetadata(
        plan as CheckoutStartedMetadata["plan"],
        postActivation,
      ),
    });

    return NextResponse.json({ url });
  }

  try {
    return await createCheckoutAndRespond(sessionParams);
  } catch (e) {
    if (trimmedStoredCustomerId.length > 0 && isStripeMissingCustomerError(e)) {
      await db.update(users).set({ stripeCustomerId: null }).where(eq(users.id, userId));
      const fallbackParams = buildStripeCheckoutSessionCreateParams({
        stripeCustomerId: null,
        customerEmail,
        baseRecurringPriceId: basePrice.priceId,
        overagePriceId: over.priceId!,
        baseUrl: base,
        plan,
        userId,
      });
      try {
        return await createCheckoutAndRespond(fallbackParams);
      } catch (e2) {
        console.error(e2);
        return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
      }
    }
    console.error(e);
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
