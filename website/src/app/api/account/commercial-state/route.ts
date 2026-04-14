import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  assembleCommercialAccountState,
  isInvalidExpectedPlanQuery,
  parseExpectedPlanQuery,
} from "@/lib/commercialAccountState";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawExpected = req.nextUrl.searchParams.get("expectedPlan");
  if (isInvalidExpectedPlanQuery(rawExpected)) {
    return NextResponse.json({ error: "Invalid expectedPlan" }, { status: 400 });
  }
  const expectedPlan = parseExpectedPlanQuery(rawExpected);

  try {
    const payload = await assembleCommercialAccountState({
      userId: session.user.id,
      expectedPlan,
      operatorContactEmail: process.env.CONTACT_SALES_EMAIL,
    });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
