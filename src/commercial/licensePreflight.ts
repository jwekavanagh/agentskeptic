import { CLI_OPERATIONAL_CODES } from "../cliOperationalCodes.js";
import { TruthLayerError } from "../truthLayerError.js";
import { LICENSE_PREFLIGHT_ENABLED } from "../generated/commercialBuildFlags.js";
import { postUsageReserve, resolveApiKey } from "../sdk/transport.js";

export type LicensePreflightIntent = "verify" | "enforce";

export type LicensePreflightResult = { runId: string | null };

/**
 * Before contract-mode verification (commercial npm build), contact license API.
 * Returns `{ runId: null }` when LICENSE_PREFLIGHT_ENABLED is false (OSS profile).
 */
export async function runLicensePreflightIfNeeded(
  intent: LicensePreflightIntent = "verify",
  opts?: { runId?: string; xRequestId?: string },
): Promise<LicensePreflightResult> {
  if (!LICENSE_PREFLIGHT_ENABLED) return { runId: null };

  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_KEY_MISSING,
      "Commercial agentskeptic requires AGENTSKEPTIC_API_KEY for contract verification (legacy WORKFLOW_VERIFIER_API_KEY is still accepted). Sign in at the product website to obtain a key.",
    );
  }

  const runId =
    opts?.runId?.trim() ||
    process.env.AGENTSKEPTIC_RUN_ID?.trim() ||
    process.env.WORKFLOW_VERIFIER_RUN_ID?.trim() ||
    crypto.randomUUID();
  const xRequestId = opts?.xRequestId?.trim() || crypto.randomUUID();
  const issuedAt = new Date().toISOString();

  await postUsageReserve({
    intent,
    runId,
    issuedAtIso: issuedAt,
    xRequestId,
    apiKey,
  });
  return { runId };
}
