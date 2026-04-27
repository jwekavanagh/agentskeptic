import { NextRequest } from "next/server";
import { activationJson, activationReserveDeny } from "@/lib/activationHttp";
import { authenticateApiKey, requireScopes } from "@/lib/apiKeyAuthGateway";
import { parseProjectionInput, upsertBaseline, appendEnforcementEvent } from "@/lib/enforcementState";

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
    event: "baseline_created",
    expectedProjectionHash: null,
    actualProjectionHash: body.projection_hash,
  });

  return activationJson(req, { schema_version: 1, status: "baseline_created", workflow_id: body.workflow_id }, 200);
}

