import { NextRequest } from "next/server";
import { activationJson, activationReserveDeny } from "@/lib/activationHttp";
import { authenticateApiKey, requireScopes } from "@/lib/apiKeyAuthGateway";
import { appendEnforcementEvent, getBaseline, parseProjectionInput } from "@/lib/enforcementState";

export async function POST(req: NextRequest) {
  const authn = await authenticateApiKey(req);
  if (!authn.ok) return authn.response;
  const scope = requireScopes(req, authn.principal, ["meter"]);
  if (!scope.ok) return scope.response;

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

  const baseline = await getBaseline({ userId: authn.principal.userId, workflowId: body.workflow_id });
  if (!baseline) {
    return activationReserveDeny(req, {
      status: 409,
      code: "ENFORCE_BASELINE_REQUIRED",
      message: "No accepted baseline exists. Run enforce with --create-baseline first.",
    });
  }

  const isMatch = baseline.projectionHash === body.projection_hash;
  await appendEnforcementEvent({
    userId: authn.principal.userId,
    workflowId: body.workflow_id,
    runId: body.run_id,
    event: isMatch ? "check_pass" : "drift_detected",
    expectedProjectionHash: baseline.projectionHash,
    actualProjectionHash: body.projection_hash,
  });

  return activationJson(
    req,
    {
      schema_version: 1,
      status: isMatch ? "ok" : "drift",
      workflow_id: body.workflow_id,
      expected_projection_hash: baseline.projectionHash,
      actual_projection_hash: body.projection_hash,
    },
    200,
  );
}

