import { NextRequest } from "next/server";
import { activationJson, activationReserveDeny } from "@/lib/activationHttp";
import { authenticateApiKey, requireScopes } from "@/lib/apiKeyAuthGateway";
import { appendEnforcementEvent, parseProjectionInput, upsertBaseline } from "@/lib/enforcementState";
import { canUseStatefulEnforcement } from "@/lib/enforcementEntitlement";

export async function POST(req: NextRequest) {
  const authn = await authenticateApiKey(req);
  if (!authn.ok) return authn.response;
  const scope = requireScopes(req, authn.principal, ["meter"]);
  if (!scope.ok) return scope.response;
  const ent = canUseStatefulEnforcement({
    plan: authn.principal.user.plan,
    subscriptionStatus: authn.principal.user.subscriptionStatus,
  });
  if (!ent.ok) {
    return activationReserveDeny(req, {
      status: 403,
      code: ent.code,
      message:
        ent.code === "ENFORCEMENT_REQUIRES_PAID_PLAN"
          ? "Stateful enforcement requires a paid plan."
          : "Subscription is not active for stateful enforcement.",
    });
  }

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    return activationReserveDeny(req, { status: 400, code: "BAD_REQUEST", message: "Invalid JSON body." });
  }
  const body = parseProjectionInput(bodyUnknown);
  if (!body) {
    return activationReserveDeny(req, { status: 400, code: "BAD_REQUEST", message: "Missing run/workflow/projection fields." });
  }

  await upsertBaseline({
    userId: authn.principal.userId,
    keyId: authn.principal.keyId,
    workflowId: body.workflow_id,
    projectionHash: body.projection_hash,
    projection: body.projection,
  });
  await appendEnforcementEvent({
    userId: authn.principal.userId,
    workflowId: body.workflow_id,
    runId: body.run_id,
    event: "drift_accepted",
    expectedProjectionHash: null,
    actualProjectionHash: body.projection_hash,
  });

  return activationJson(
    req,
    { schema_version: 1, status: "accepted", workflow_id: body.workflow_id, quota_enforced_via_reserve: true },
    200,
  );
}

