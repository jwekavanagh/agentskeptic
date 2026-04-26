import type { NextRequest } from "next/server";
import { activationJson, activationProblem, ACTIVATION_PROBLEM_BASE } from "@/lib/activationHttp";
import { authenticateApiKey, requireScopes } from "@/lib/apiKeyAuthGateway";
import type { PlanId } from "@/lib/plans";
import { loadCommercialPlans } from "@/lib/plans";
import { loadUsageSnapshotForUser } from "@/lib/usageSnapshot";

export async function GET(req: NextRequest) {
  const authn = await authenticateApiKey(req);
  if (!authn.ok) return authn.response;

  const scopeCheck = requireScopes(req, authn.principal, ["meter"]);
  if (!scopeCheck.ok) return scopeCheck.response;

  const planId = authn.principal.user.plan as PlanId;
  const plans = loadCommercialPlans();
  if (!plans.plans[planId]) {
    return activationProblem(req, {
      status: 503,
      type: `${ACTIVATION_PROBLEM_BASE}/plans-unavailable`,
      title: "Plans unavailable",
      detail: "Could not load commercial plans configuration.",
      code: "PLANS_UNAVAILABLE",
    });
  }

  try {
    const snapshot = await loadUsageSnapshotForUser({
      userId: authn.principal.userId,
      planId,
    });
    return activationJson(req, snapshot, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("PLANS_UNAVAILABLE")) {
      return activationProblem(req, {
        status: 503,
        type: `${ACTIVATION_PROBLEM_BASE}/plans-unavailable`,
        title: "Plans unavailable",
        detail: "Could not load commercial plans configuration.",
        code: "PLANS_UNAVAILABLE",
      });
    }
    return activationProblem(req, {
      status: 503,
      type: `${ACTIVATION_PROBLEM_BASE}/server-error`,
      title: "Server unavailable",
      detail: "Could not load current usage.",
      code: "SERVER_ERROR",
    });
  }
}

