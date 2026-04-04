import type { RunEvent, ToolObservedEvent, VerificationRunContext } from "./types.js";

function isToolObserved(ev: RunEvent): ev is ToolObservedEvent {
  return ev.type === "tool_observed";
}

/** Canonical empty digest for v1-only / legacy inputs. */
export function createEmptyVerificationRunContext(): VerificationRunContext {
  return {
    maxWireSchemaVersion: 1,
    retrievalEvents: [],
    controlEvents: [],
    modelTurnEvents: [],
    toolSkippedEvents: [],
    toolObservedIngestIndexBySeq: {},
  };
}

/**
 * Deterministic digest of run events for one workflow (capture order = array index).
 */
export function buildVerificationRunContext(runEvents: RunEvent[]): VerificationRunContext {
  let maxWire = 1 as 1 | 2;
  const retrievalEvents: VerificationRunContext["retrievalEvents"] = [];
  const controlEvents: VerificationRunContext["controlEvents"] = [];
  const modelTurnEvents: VerificationRunContext["modelTurnEvents"] = [];
  const toolSkippedEvents: VerificationRunContext["toolSkippedEvents"] = [];
  const toolObservedIngestIndexBySeq: Record<string, number> = {};

  for (let ingestIndex = 0; ingestIndex < runEvents.length; ingestIndex++) {
    const ev = runEvents[ingestIndex]!;
    const sv = ev.schemaVersion;
    if (sv === 2) {
      maxWire = 2;
    }

    if (ev.type === "retrieval" && ev.schemaVersion === 2) {
      retrievalEvents.push({
        ingestIndex,
        runEventId: ev.runEventId,
        source: ev.source,
        status: ev.status,
      });
    } else if (ev.type === "control" && ev.schemaVersion === 2) {
      controlEvents.push({
        ingestIndex,
        runEventId: ev.runEventId,
        controlKind: ev.controlKind,
        ...(ev.decision !== undefined ? { decision: ev.decision } : {}),
        ...(ev.label !== undefined ? { label: ev.label } : {}),
      });
    } else if (ev.type === "model_turn" && ev.schemaVersion === 2) {
      modelTurnEvents.push({
        ingestIndex,
        runEventId: ev.runEventId,
        status: ev.status,
      });
    } else if (ev.type === "tool_skipped" && ev.schemaVersion === 2) {
      toolSkippedEvents.push({
        ingestIndex,
        toolId: ev.toolId,
        reason: ev.reason,
      });
    } else if (isToolObserved(ev)) {
      toolObservedIngestIndexBySeq[String(ev.seq)] = ingestIndex;
    }
  }

  return {
    maxWireSchemaVersion: maxWire,
    retrievalEvents,
    controlEvents,
    modelTurnEvents,
    toolSkippedEvents,
    toolObservedIngestIndexBySeq,
  };
}
