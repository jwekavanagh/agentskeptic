import { NextResponse } from "next/server";
import type { PlanId } from "@/lib/plans";
import { loadCommercialPlans } from "@/lib/plans";

type PublicPlan = {
  includedMonthly: number | null;
  monthlyUsdCents: number | null;
  yearlyUsdCents: number | null;
  displayPrice: string;
  displayPriceYearly: string | null;
  overageMicrousdPerVerification: number | null;
  allowOverage: boolean;
  overageDisplayLabel: string | null;
  marketingHeadline: string;
  audience: string;
  valueUnlock: string;
};

/**
 * Public plan catalog for humans and machine clients (no Stripe env key names).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const raw = loadCommercialPlans();
    const order: PlanId[] = ["starter", "individual", "team", "business", "enterprise"];
    const plans: Record<string, PublicPlan> = {};
    for (const id of order) {
      const p = raw.plans[id];
      plans[id] = {
        includedMonthly: p.includedMonthly,
        monthlyUsdCents: p.monthlyUsdCents,
        yearlyUsdCents: p.yearlyUsdCents,
        displayPrice: p.displayPrice,
        displayPriceYearly: p.displayPriceYearly,
        overageMicrousdPerVerification: p.overageMicrousdPerVerification,
        allowOverage: p.allowOverage,
        overageDisplayLabel: p.overageDisplayLabel,
        marketingHeadline: p.marketingHeadline,
        audience: p.audience,
        valueUnlock: p.valueUnlock,
      };
    }
    return NextResponse.json({ schemaVersion: raw.schemaVersion, plans });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "PLANS_UNAVAILABLE", message: "Could not load commercial plans configuration." },
      { status: 503 },
    );
  }
}
