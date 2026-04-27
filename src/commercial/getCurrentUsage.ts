import { TruthLayerError } from "../truthLayerError.js";
import { CLI_OPERATIONAL_CODES } from "../cliOperationalCodes.js";
import { LICENSE_PREFLIGHT_ENABLED } from "../generated/commercialBuildFlags.js";
import { getUsageCurrentJson } from "../sdk/transport.js";

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
  const raw = await getUsageCurrentJson();
  return raw as unknown as CurrentUsageResponse;
}
