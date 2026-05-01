import {
  LICENSE_API_BASE_URL,
  LICENSE_PREFLIGHT_ENABLED,
} from "../generated/commercialBuildFlags.js";
import { postVerifyOutcomeBestEffort } from "../sdk/transport.js";
import type { OutcomeCertificateV1 } from "../outcomeCertificate.js";
import {
  buildVerifyOutcomeBeaconBodyV2,
  type VerifyOutcomeActivationWire,
  type VerifyOutcomeSubcommand,
  type VerifyOutcomeTerminalStatus,
  type VerifyOutcomeWorkloadClass,
} from "./verifyOutcomeBeaconBody.js";

export type PostVerifyOutcomeBeaconInput = {
  runId: string | null;
  certificate: OutcomeCertificateV1;
  terminal_status: VerifyOutcomeTerminalStatus;
  workload_class: VerifyOutcomeWorkloadClass;
  xRequestId?: string;
} & (
  | { subcommand: "activate"; activation: VerifyOutcomeActivationWire }
  | { subcommand: Exclude<VerifyOutcomeSubcommand, "activate"> }
);

/**
 * Best-effort POST to license origin. Never throws; never logs secrets.
 */
export async function postVerifyOutcomeBeacon(input: PostVerifyOutcomeBeaconInput): Promise<void> {
  if (!LICENSE_PREFLIGHT_ENABLED || input.runId === null) return;

  const apiKey =
    process.env.AGENTSKEPTIC_API_KEY?.trim() ||
    process.env.WORKFLOW_VERIFIER_API_KEY?.trim();
  if (!apiKey) return;

  const url = `${LICENSE_API_BASE_URL.replace(/\/$/, "")}/api/v1/funnel/verify-outcome`;
  const body =
    input.subcommand === "activate"
      ? buildVerifyOutcomeBeaconBodyV2({
          run_id: input.runId,
          certificate: input.certificate,
          terminal_status: input.terminal_status,
          workload_class: input.workload_class,
          subcommand: "activate",
          activation: input.activation,
        })
      : buildVerifyOutcomeBeaconBodyV2({
          run_id: input.runId,
          certificate: input.certificate,
          terminal_status: input.terminal_status,
          workload_class: input.workload_class,
          subcommand: input.subcommand,
        });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (input.xRequestId?.trim()) {
    headers["x-request-id"] = input.xRequestId.trim();
  }
  await postVerifyOutcomeBestEffort({ url, body, headers, timeoutMs: 400 });
}
