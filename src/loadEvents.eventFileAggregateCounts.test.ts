import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadEventsForWorkflow } from "./loadEvents.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, "..", "test", "fixtures", "adoption-validation", "wrong-workflow-id.events.ndjson");

describe("loadEvents eventFileAggregateCounts", () => {
  it("counts wrong-workflow-id fixture for wf_requested", () => {
    const { eventFileAggregateCounts } = loadEventsForWorkflow(fixture, "wf_requested");
    expect(eventFileAggregateCounts).toEqual({
      eventFileNonEmptyLines: 3,
      schemaValidEvents: 2,
      toolObservedForRequestedWorkflowId: 0,
      toolObservedForOtherWorkflowIds: 2,
    });
  });
});
