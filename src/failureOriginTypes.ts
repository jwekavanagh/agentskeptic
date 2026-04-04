/** Shared FailureOrigin literals (no runtime deps). Schema + catalog must stay aligned. */
export const FAILURE_ORIGINS = [
  "decision_making",
  "inputs",
  "retrieval",
  "tool_use",
  "workflow_flow",
  "downstream_system_state",
] as const;

export type FailureOrigin = (typeof FAILURE_ORIGINS)[number];
