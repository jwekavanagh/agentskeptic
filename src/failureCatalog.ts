import {
  CLI_OPERATIONAL_CODES,
  type OperationalCode,
} from "./cliOperationalCodes.js";
import { buildOperationalFailureDiagnosis } from "./operationalFailureDiagnosis.js";
import type { Reason } from "./types.js";

/** Re-export for existing importers of `failureCatalog.js`. */
export { CLI_OPERATIONAL_CODES, type OperationalCode };

/** CLI operational error envelope (stderr, exit 3). */
export const CLI_ERROR_SCHEMA_VERSION = 2 as const;
export const CLI_ERROR_KIND = "execution_truth_layer_error" as const;

export const OPERATIONAL_MESSAGE_MAX_CHARS = 2048;

/** Same literal as step `incomplete_verification` for divergent retries (SSOT + registry validation). */
export const RETRY_OBSERVATIONS_DIVERGE_MESSAGE =
  "Multiple observations for this seq do not all match the last observation (toolId and canonical params).";

export const RUN_LEVEL_MESSAGES = {
  MALFORMED_EVENT_LINE:
    "Event line was missing, invalid JSON, or failed schema validation for a tool observation.",
  NO_STEPS_FOR_WORKFLOW: "No tool_observed events for this workflow id after filtering.",
  LANGGRAPH_CHECKPOINT_TRUST_NON_V3_TOOL_OBSERVED:
    "LangGraph checkpoint trust requires every tool_observed line for this workflow to use schemaVersion 3 with langgraphCheckpoint.",
} as const;

export function runLevelIssue(code: keyof typeof RUN_LEVEL_MESSAGES): Reason {
  return { code, message: RUN_LEVEL_MESSAGES[code] };
}

/** SSOT for WorkflowResult.eventSequenceIntegrity.reasons (machine codes + messages). */
export const EVENT_SEQUENCE_MESSAGES = {
  CAPTURE_ORDER_NOT_MONOTONIC_IN_SEQ:
    "Capture order was not non-decreasing in seq; planning and verification used seq-sorted order, not arrival order.",
} as const;

export type EventSequenceIssueCode = keyof typeof EVENT_SEQUENCE_MESSAGES;

export function eventSequenceIssue(code: EventSequenceIssueCode): Reason {
  return { code, message: EVENT_SEQUENCE_MESSAGES[code] };
}

const TIMESTAMP_NOT_MONOTONIC_CODE = "TIMESTAMP_NOT_MONOTONIC_WITH_SEQ_SORT_ORDER" as const;

/** First adjacent pair in seq-sorted order with decreasing parsed timestamps (seq values from those events). */
export function eventSequenceTimestampNotMonotonicReason(seqBefore: number, seqAfter: number): Reason {
  return {
    code: TIMESTAMP_NOT_MONOTONIC_CODE,
    message: `In seq-sorted order, timestamp decreased between seq ${seqBefore} and seq ${seqAfter}.`,
  };
}

export function formatOperationalMessage(raw: string): string {
  let s = raw.replace(/\t|\r|\n/g, " ");
  s = s.replace(/ +/g, " ").trim();
  const max = OPERATIONAL_MESSAGE_MAX_CHARS;
  if (s.length > max) {
    return `${s.slice(0, max - 3)}...`;
  }
  return s;
}

export function cliErrorEnvelope(code: string, message: string): string {
  return JSON.stringify({
    schemaVersion: CLI_ERROR_SCHEMA_VERSION,
    kind: CLI_ERROR_KIND,
    code,
    message: formatOperationalMessage(message),
    failureDiagnosis: buildOperationalFailureDiagnosis(code),
  });
}
