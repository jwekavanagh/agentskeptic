import { createHash, randomUUID } from "node:crypto";
import { CLI_OPERATIONAL_CODES } from "./cliOperationalCodes.js";
import { parseBatchVerifyCliArgs } from "./cliArgv.js";
import { verifyWorkflow } from "./pipeline.js";
import { runBatchVerifyToValidatedResult } from "./standardVerifyWorkflowCli.js";
import { TruthLayerError } from "./truthLayerError.js";
import { workflowResultToEnforcementProjectionV1, stableStringify } from "./enforcementProjection.js";
import { runLicensePreflightIfNeeded } from "./commercial/licensePreflight.js";
import { cliErrorEnvelope } from "./failureCatalog.js";
import { postEnforcementJson } from "./sdk/transport.js";

type EnforceMode = "check" | "create-baseline" | "accept-drift";

function parseEnforceMode(args: string[]): EnforceMode {
  const hasCreate = args.includes("--create-baseline");
  const hasAccept = args.includes("--accept-drift");
  if (hasCreate && hasAccept) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.ENFORCE_USAGE,
      "Use at most one of --create-baseline or --accept-drift.",
    );
  }
  if (hasCreate) return "create-baseline";
  if (hasAccept) return "accept-drift";
  return "check";
}

function stripEnforceModeArgs(args: string[]): string[] {
  return args.filter((a) => a !== "--create-baseline" && a !== "--accept-drift");
}

function apiKeyOrThrow(): string {
  const apiKey =
    process.env.AGENTSKEPTIC_API_KEY?.trim() ||
    process.env.WORKFLOW_VERIFIER_API_KEY?.trim();
  if (!apiKey) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_KEY_MISSING,
      "Commercial agentskeptic enforce requires AGENTSKEPTIC_API_KEY.",
    );
  }
  return apiKey;
}

async function postEnforcementState(
  path: "/api/v1/enforcement/baselines" | "/api/v1/enforcement/check" | "/api/v1/enforcement/accept",
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: unknown; requestId: string | null }> {
  const apiKey = apiKeyOrThrow();
  return postEnforcementJson({ path, payload, apiKey });
}

function projectionHash(projectionUtf8: string): string {
  return createHash("sha256").update(projectionUtf8, "utf8").digest("hex");
}

export async function runStatefulEnforce(args: string[]): Promise<void> {
  const mode = parseEnforceMode(args);
  const parsed = parseBatchVerifyCliArgs(stripEnforceModeArgs(args));

  const runId =
    process.env.AGENTSKEPTIC_RUN_ID?.trim() ||
    process.env.WORKFLOW_VERIFIER_RUN_ID?.trim() ||
    randomUUID();
  await runLicensePreflightIfNeeded("enforce", { runId, xRequestId: randomUUID() });

  const wf = await runBatchVerifyToValidatedResult(() =>
    verifyWorkflow({
      workflowId: parsed.workflowId,
      eventsPath: parsed.eventsPath,
      registryPath: parsed.registryPath,
      database: parsed.database,
      verificationPolicy: parsed.verificationPolicy,
      truthReport: parsed.noHumanReport ? () => {} : (report) => process.stderr.write(`${report}\n`),
    }),
  );
  const projection = workflowResultToEnforcementProjectionV1(wf);
  const projectionUtf8 = stableStringify(projection);
  const payload = {
    run_id: runId,
    workflow_id: parsed.workflowId,
    projection_hash: projectionHash(projectionUtf8),
    projection,
  };

  const route =
    mode === "create-baseline" ? "/api/v1/enforcement/baselines"
    : mode === "accept-drift" ? "/api/v1/enforcement/accept"
    : "/api/v1/enforcement/check";

  const stateRes = await postEnforcementState(route, payload);
  if (!stateRes.ok) {
    const detail =
      typeof stateRes.body === "object" && stateRes.body !== null && "detail" in stateRes.body
        ? String((stateRes.body as { detail?: unknown }).detail ?? `HTTP ${stateRes.status}`)
        : `HTTP ${stateRes.status}`;
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_DENIED,
      `${detail}${stateRes.requestId ? ` [x-request-id=${stateRes.requestId}]` : ""}`,
    );
  }

  const status =
    typeof stateRes.body === "object" && stateRes.body !== null && "status" in stateRes.body
      ? String((stateRes.body as { status?: unknown }).status ?? "ok")
      : "ok";
  process.stdout.write(`${stableStringify({ schemaVersion: 1, enforce: stateRes.body })}\n`);
  if (status === "drift") {
    console.error(cliErrorEnvelope(CLI_OPERATIONAL_CODES.VERIFICATION_OUTPUT_LOCK_MISMATCH, "Drift detected."));
    process.exit(4);
  }
  if (wf.status === "complete") process.exit(0);
  if (wf.status === "inconsistent") process.exit(1);
  process.exit(2);
}

