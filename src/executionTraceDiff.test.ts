import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildExecutionTraceView } from "./executionTrace.js";
import { buildTracePairwisePayload } from "./executionTraceDiff.js";
import { loadEventsForWorkflow } from "./loadEvents.js";
import type { WorkflowResult } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("buildTracePairwisePayload", () => {
  it("identical corpus runs: in_both for shared seq; timeline not diverged", () => {
    const base = join(root, "test/fixtures/debug-ui-compare");
    const wrPath = join(base, "run_a/workflow-result.json");
    const evPath = join(base, "run_a/events.ndjson");
    const wr = JSON.parse(readFileSync(wrPath, "utf8")) as WorkflowResult;
    const a = loadEventsForWorkflow(evPath, wr.workflowId);
    const b = loadEventsForWorkflow(evPath, wr.workflowId);
    const priorView = buildExecutionTraceView({
      workflowId: wr.workflowId,
      runEvents: a.runEvents,
      malformedEventLineCount: a.malformedEventLineCount,
      workflowResult: wr,
    });
    const currentView = buildExecutionTraceView({
      workflowId: wr.workflowId,
      runEvents: b.runEvents,
      malformedEventLineCount: b.malformedEventLineCount,
      workflowResult: wr,
    });
    const d = buildTracePairwisePayload({
      priorView,
      currentView,
      priorRunIndex: 0,
      currentRunIndex: 1,
    });
    expect(d.seqTimelineOrderDiverged).toBe(false);
    expect(d.bySeq.every((r) => r.class === "in_both")).toBe(true);
    expect(stringifySorted(d.nonToolEventCounts.prior)).toBe(
      stringifySorted(d.nonToolEventCounts.current),
    );
  });
});

function stringifySorted(o: Record<string, number>): string {
  return JSON.stringify(o, Object.keys(o).sort());
}
