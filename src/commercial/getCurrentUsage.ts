import { TruthLayerError } from "../truthLayerError.js";
import { CLI_OPERATIONAL_CODES } from "../cliOperationalCodes.js";
import { LICENSE_API_BASE_URL, LICENSE_PREFLIGHT_ENABLED } from "../generated/commercialBuildFlags.js";

export type CurrentUsageResponse = {
  schema_version: 1;
  plan: "starter" | "individual" | "team" | "business" | "enterprise";
  year_month: string;
  period_start_utc: string;
  period_end_utc: string;
  used_total: number;
  included_monthly: number | null;
  allow_overage: boolean;
  overage_count: number;
  quota_state: "ok" | "notice" | "warning" | "in_overage" | "at_cap";
  allowed_next: boolean;
  estimated_overage_usd: string;
};

export async function fetchCurrentUsage(): Promise<CurrentUsageResponse> {
  if (!LICENSE_PREFLIGHT_ENABLED) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_DENIED,
      "Current usage is available only in commercial builds.",
    );
  }
  const apiKey =
    process.env.AGENTSKEPTIC_API_KEY?.trim() ||
    process.env.WORKFLOW_VERIFIER_API_KEY?.trim();
  if (!apiKey) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_KEY_MISSING,
      "Commercial agentskeptic requires AGENTSKEPTIC_API_KEY.",
    );
  }

  const url = `${LICENSE_API_BASE_URL.replace(/\/$/, "")}/api/v1/usage/current`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-request-id": crypto.randomUUID(),
    },
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    parsed = null;
  }
  if (!res.ok || !parsed || typeof parsed !== "object") {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_USAGE_UNAVAILABLE,
      `Could not load current usage (HTTP ${res.status}).`,
    );
  }
  return parsed as CurrentUsageResponse;
}

