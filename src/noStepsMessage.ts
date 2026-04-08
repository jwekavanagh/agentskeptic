import type { EventFileAggregateCounts } from "./types.js";

export function formatNoStepsForWorkflowMessage(
  workflowId: string,
  c: EventFileAggregateCounts,
): string {
  return `No tool_observed events for workflowId ${JSON.stringify(workflowId)} after filtering. event_file_non_empty_lines=${String(c.eventFileNonEmptyLines)} schema_valid_events=${String(c.schemaValidEvents)} tool_observed_for_workflow=${String(c.toolObservedForRequestedWorkflowId)} tool_observed_other_workflows=${String(c.toolObservedForOtherWorkflowIds)}.`;
}

export function enrichNoStepsRunLevelReasons(
  workflowId: string,
  reasons: { code: string; message: string }[],
  c: EventFileAggregateCounts,
): void {
  const msg = formatNoStepsForWorkflowMessage(workflowId, c);
  for (const r of reasons) {
    if (r.code === "NO_STEPS_FOR_WORKFLOW") {
      r.message = msg;
    }
  }
}
