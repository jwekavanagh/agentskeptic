/**
 * Single source of truth for code → FailureOrigin mappings.
 * FailureOrigin literals: `failureOriginTypes.ts`. JSON Schema enum parity: failureOriginSchemaParity.test.ts.
 */

import { CLI_OPERATIONAL_CODES, type OperationalCode } from "./cliOperationalCodes.js";
import type { FailureOrigin } from "./failureOriginTypes.js";
import { RESOLVE_FAILURE_CODES } from "./resolveFailureCodes.js";

export type { FailureOrigin } from "./failureOriginTypes.js";
export { FAILURE_ORIGINS } from "./failureOriginTypes.js";

/** Sentinel for steps with empty reasons (should not occur in production). */
export const STEP_NO_REASON_CODE = "STEP_NO_REASON" as const;

/** Test-only reason from aggregate tests; not emitted by verification pipeline. */
export const TEST_BLOCKING_CODE = "TEST_BLOCKING_CODE" as const;

const DOWNSTREAM = "downstream_system_state" as const satisfies FailureOrigin;
const INPUTS = "inputs" as const satisfies FailureOrigin;
const TOOL_USE = "tool_use" as const satisfies FailureOrigin;
const WORKFLOW_FLOW = "workflow_flow" as const satisfies FailureOrigin;

/**
 * Step-level verification reason codes → primary FailureOrigin (before P5b effect override).
 * Every production-emitted step reason code must appear here.
 */
export const REASON_CODE_TO_ORIGIN: Record<string, FailureOrigin> = {
  [STEP_NO_REASON_CODE]: WORKFLOW_FLOW,
  [TEST_BLOCKING_CODE]: WORKFLOW_FLOW,

  ROW_ABSENT: DOWNSTREAM,
  DUPLICATE_ROWS: DOWNSTREAM,
  VALUE_MISMATCH: DOWNSTREAM,
  ROW_NOT_OBSERVED_WITHIN_WINDOW: DOWNSTREAM,
  MULTI_EFFECT_UNCERTAIN_WITHIN_WINDOW: DOWNSTREAM,

  CONNECTOR_ERROR: DOWNSTREAM,
  ROW_SHAPE_MISMATCH: DOWNSTREAM,
  UNREADABLE_VALUE: DOWNSTREAM,

  UNKNOWN_TOOL: TOOL_USE,
  RETRY_OBSERVATIONS_DIVERGE: TOOL_USE,

  MULTI_EFFECT_PARTIAL: DOWNSTREAM,
  MULTI_EFFECT_ALL_FAILED: DOWNSTREAM,
  MULTI_EFFECT_INCOMPLETE: DOWNSTREAM,

  ...Object.fromEntries([...RESOLVE_FAILURE_CODES].map((c) => [c, INPUTS])) as Record<string, FailureOrigin>,
};

export const RUN_LEVEL_CODE_TO_ORIGIN: Record<string, FailureOrigin> = {
  MALFORMED_EVENT_LINE: INPUTS,
  NO_STEPS_FOR_WORKFLOW: WORKFLOW_FLOW,
  [TEST_BLOCKING_CODE]: WORKFLOW_FLOW,
};

export const EVENT_SEQUENCE_CODE_TO_ORIGIN: Record<string, FailureOrigin> = {
  CAPTURE_ORDER_NOT_MONOTONIC_IN_SEQ: WORKFLOW_FLOW,
  TIMESTAMP_NOT_MONOTONIC_WITH_SEQ_SORT_ORDER: WORKFLOW_FLOW,
};

const OP = {
  inputs: INPUTS,
  downstream: DOWNSTREAM,
  workflow_flow: WORKFLOW_FLOW,
} as const;

/** Every CLI_OPERATIONAL_CODES value → FailureOrigin. */
export const OPERATIONAL_CODE_TO_ORIGIN: Record<OperationalCode, FailureOrigin> = {
  [CLI_OPERATIONAL_CODES.CLI_USAGE]: OP.inputs,
  [CLI_OPERATIONAL_CODES.REGISTRY_READ_FAILED]: OP.inputs,
  [CLI_OPERATIONAL_CODES.REGISTRY_JSON_SYNTAX]: OP.inputs,
  [CLI_OPERATIONAL_CODES.REGISTRY_SCHEMA_INVALID]: OP.inputs,
  [CLI_OPERATIONAL_CODES.REGISTRY_DUPLICATE_TOOL_ID]: OP.inputs,
  [CLI_OPERATIONAL_CODES.EVENTS_READ_FAILED]: OP.inputs,
  [CLI_OPERATIONAL_CODES.SQLITE_DATABASE_OPEN_FAILED]: OP.downstream,
  [CLI_OPERATIONAL_CODES.POSTGRES_CLIENT_SETUP_FAILED]: OP.downstream,
  [CLI_OPERATIONAL_CODES.WORKFLOW_RESULT_SCHEMA_INVALID]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.INTERNAL_ERROR]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.COMPARE_USAGE]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.COMPARE_INSUFFICIENT_RUNS]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.COMPARE_WORKFLOW_ID_MISMATCH]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.COMPARE_INPUT_READ_FAILED]: OP.inputs,
  [CLI_OPERATIONAL_CODES.COMPARE_INPUT_JSON_SYNTAX]: OP.inputs,
  [CLI_OPERATIONAL_CODES.COMPARE_INPUT_SCHEMA_INVALID]: OP.inputs,
  [CLI_OPERATIONAL_CODES.COMPARE_WORKFLOW_TRUTH_MISMATCH]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.COMPARE_RUN_COMPARISON_REPORT_INVALID]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.VERIFICATION_POLICY_INVALID]: OP.inputs,
  [CLI_OPERATIONAL_CODES.EVENTUAL_MODE_NOT_SUPPORTED_IN_PROCESS_HOOK]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.VALIDATE_REGISTRY_USAGE]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.EXECUTION_TRACE_USAGE]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.TRACE_DUPLICATE_RUN_EVENT_ID]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.TRACE_UNKNOWN_PARENT_RUN_EVENT_ID]: OP.workflow_flow,
  [CLI_OPERATIONAL_CODES.TRACE_PARENT_FORWARD_REFERENCE]: OP.workflow_flow,
};

/** Short operational diagnosis summaries (single line, truncation-safe). */
export const OPERATIONAL_CODE_TO_SUMMARY: Record<OperationalCode, string> = {
  [CLI_OPERATIONAL_CODES.CLI_USAGE]: "Invalid or incomplete CLI arguments for verify-workflow.",
  [CLI_OPERATIONAL_CODES.REGISTRY_READ_FAILED]: "Tools registry file could not be read.",
  [CLI_OPERATIONAL_CODES.REGISTRY_JSON_SYNTAX]: "Tools registry JSON could not be parsed.",
  [CLI_OPERATIONAL_CODES.REGISTRY_SCHEMA_INVALID]: "Tools registry failed schema validation.",
  [CLI_OPERATIONAL_CODES.REGISTRY_DUPLICATE_TOOL_ID]: "Tools registry contains duplicate toolId entries.",
  [CLI_OPERATIONAL_CODES.EVENTS_READ_FAILED]: "Events file could not be read.",
  [CLI_OPERATIONAL_CODES.SQLITE_DATABASE_OPEN_FAILED]: "SQLite verification database could not be opened.",
  [CLI_OPERATIONAL_CODES.POSTGRES_CLIENT_SETUP_FAILED]: "Postgres verification client could not be established.",
  [CLI_OPERATIONAL_CODES.WORKFLOW_RESULT_SCHEMA_INVALID]: "Emitted workflow result failed JSON schema validation.",
  [CLI_OPERATIONAL_CODES.INTERNAL_ERROR]: "Unexpected internal error in the execution truth layer.",
  [CLI_OPERATIONAL_CODES.COMPARE_USAGE]: "Invalid or incomplete arguments for verify-workflow compare.",
  [CLI_OPERATIONAL_CODES.COMPARE_INSUFFICIENT_RUNS]: "compare requires at least two WorkflowResult inputs.",
  [CLI_OPERATIONAL_CODES.COMPARE_WORKFLOW_ID_MISMATCH]: "Compared WorkflowResult files use different workflowId values.",
  [CLI_OPERATIONAL_CODES.COMPARE_INPUT_READ_FAILED]: "A compare input file could not be read.",
  [CLI_OPERATIONAL_CODES.COMPARE_INPUT_JSON_SYNTAX]: "A compare input file is not valid JSON.",
  [CLI_OPERATIONAL_CODES.COMPARE_INPUT_SCHEMA_INVALID]: "A compare input file failed WorkflowResult schema validation.",
  [CLI_OPERATIONAL_CODES.COMPARE_WORKFLOW_TRUTH_MISMATCH]: "Saved workflowTruthReport does not match recomputation from engine fields.",
  [CLI_OPERATIONAL_CODES.COMPARE_RUN_COMPARISON_REPORT_INVALID]: "Run comparison report failed schema validation.",
  [CLI_OPERATIONAL_CODES.VERIFICATION_POLICY_INVALID]: "Verification policy arguments are invalid.",
  [CLI_OPERATIONAL_CODES.EVENTUAL_MODE_NOT_SUPPORTED_IN_PROCESS_HOOK]:
    "In-process verification does not support eventual consistency; use batch verifyWorkflow.",
  [CLI_OPERATIONAL_CODES.VALIDATE_REGISTRY_USAGE]: "Invalid or incomplete arguments for validate-registry.",
  [CLI_OPERATIONAL_CODES.EXECUTION_TRACE_USAGE]: "Invalid or incomplete arguments for execution-trace.",
  [CLI_OPERATIONAL_CODES.TRACE_DUPLICATE_RUN_EVENT_ID]: "Duplicate runEventId in execution trace input.",
  [CLI_OPERATIONAL_CODES.TRACE_UNKNOWN_PARENT_RUN_EVENT_ID]: "parentRunEventId does not reference a prior event.",
  [CLI_OPERATIONAL_CODES.TRACE_PARENT_FORWARD_REFERENCE]: "parentRunEventId references an event that is not strictly earlier.",
};

export function originForStepReasonCode(code: string): FailureOrigin {
  const o = REASON_CODE_TO_ORIGIN[code];
  if (o === undefined) {
    throw new Error(`REASON_CODE_TO_ORIGIN missing required code: ${code}`);
  }
  return o;
}

export function originForRunLevelCode(code: string): FailureOrigin {
  const o = RUN_LEVEL_CODE_TO_ORIGIN[code];
  if (o === undefined) {
    throw new Error(`RUN_LEVEL_CODE_TO_ORIGIN missing required code: ${code}`);
  }
  return o;
}

export function originForEventSequenceCode(code: string): FailureOrigin {
  const o = EVENT_SEQUENCE_CODE_TO_ORIGIN[code];
  if (o === undefined) {
    throw new Error(`EVENT_SEQUENCE_CODE_TO_ORIGIN missing required code: ${code}`);
  }
  return o;
}

export function originForOperationalCode(code: string): FailureOrigin {
  if (!(code in OPERATIONAL_CODE_TO_ORIGIN)) {
    throw new Error(`OPERATIONAL_CODE_TO_ORIGIN missing required code: ${code}`);
  }
  return OPERATIONAL_CODE_TO_ORIGIN[code as OperationalCode];
}

/** Union of every production step reason code the exhaustiveness test must cover. */
export const PRODUCTION_STEP_REASON_CODES: ReadonlySet<string> = new Set([
  ...Object.keys(REASON_CODE_TO_ORIGIN).filter(
    (c) => c !== STEP_NO_REASON_CODE && c !== TEST_BLOCKING_CODE,
  ),
]);
