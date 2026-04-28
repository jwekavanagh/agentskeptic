import { randomUUID } from "node:crypto";
import { CLI_OPERATIONAL_CODES } from "../../cliOperationalCodes.js";
import { TruthLayerError } from "../../truthLayerError.js";
import type {
  ControlRunEvent,
  ModelTurnRunEvent,
  RetrievalRunEvent,
  RunEvent,
  ToolObservedEvent,
  ToolSkippedRunEvent,
} from "../../types.js";
import type { ControlKind, EventEmitterInit, ModelTurnStatus, RetrievalStatus } from "./types.js";

export class CanonicalEventEmitter {
  private seq = 0;
  private parentRunEventId: string | undefined;
  private readonly workflowId: string;
  private readonly defaultToolObservedSchemaVersion: 1 | 2;

  constructor(private readonly init: EventEmitterInit) {
    if (!init.workflowId.trim()) {
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.EMIT_WORKFLOW_ID_INVALID, "workflowId must be non-empty.");
    }
    this.workflowId = init.workflowId;
    this.defaultToolObservedSchemaVersion = init.defaultToolObservedSchemaVersion ?? 2;
  }

  private async emit(event: RunEvent): Promise<RunEvent> {
    await this.init.sink.write(event);
    if (event.schemaVersion === 2 || event.schemaVersion === 3) {
      this.parentRunEventId = event.runEventId;
    }
    return event;
  }

  async emitToolObserved(input: {
    toolId: string;
    params: Record<string, unknown>;
    timestamp?: string;
    schemaVersion?: 1 | 2;
  }): Promise<ToolObservedEvent> {
    if (!input.toolId.trim()) {
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.EMIT_TOOL_ID_INVALID, "toolId must be non-empty.");
    }
    const schemaVersion = input.schemaVersion ?? this.defaultToolObservedSchemaVersion;
    if (schemaVersion === 1) {
      const ev: ToolObservedEvent = {
        schemaVersion: 1,
        workflowId: this.workflowId,
        seq: this.seq++,
        type: "tool_observed",
        toolId: input.toolId,
        params: input.params,
        ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      };
      return (await this.emit(ev)) as ToolObservedEvent;
    }
    const ev: ToolObservedEvent = {
      schemaVersion: 2,
      workflowId: this.workflowId,
      runEventId: randomUUID(),
      ...(this.parentRunEventId ? { parentRunEventId: this.parentRunEventId } : {}),
      type: "tool_observed",
      seq: this.seq++,
      toolId: input.toolId,
      params: input.params,
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
    };
    return (await this.emit(ev)) as ToolObservedEvent;
  }

  async emitToolObservedLangGraphCheckpoint(input: {
    toolId: string;
    params: Record<string, unknown>;
    threadId: string;
    checkpointNs: string;
    checkpointId: string;
    timestamp?: string;
  }): Promise<ToolObservedEvent> {
    if (!input.toolId.trim()) {
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.EMIT_TOOL_ID_INVALID, "toolId must be non-empty.");
    }
    if (!input.threadId.trim() || !input.checkpointId.trim()) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.EMIT_LANGGRAPH_CHECKPOINT_INVALID,
        "langgraph checkpoint threadId/checkpointId must be non-empty.",
      );
    }
    const ev: ToolObservedEvent = {
      schemaVersion: 3,
      workflowId: this.workflowId,
      runEventId: randomUUID(),
      ...(this.parentRunEventId ? { parentRunEventId: this.parentRunEventId } : {}),
      type: "tool_observed",
      seq: this.seq++,
      toolId: input.toolId,
      params: input.params,
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      langgraphCheckpoint: {
        threadId: input.threadId,
        checkpointNs: input.checkpointNs,
        checkpointId: input.checkpointId,
      },
    };
    return (await this.emit(ev)) as ToolObservedEvent;
  }

  async emitModelTurn(input: {
    status: ModelTurnStatus;
    summary?: string;
    timestamp?: string;
  }): Promise<ModelTurnRunEvent> {
    const ev: ModelTurnRunEvent = {
      schemaVersion: 2,
      workflowId: this.workflowId,
      runEventId: randomUUID(),
      ...(this.parentRunEventId ? { parentRunEventId: this.parentRunEventId } : {}),
      type: "model_turn",
      status: input.status,
      ...(input.summary ? { summary: input.summary } : {}),
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
    };
    return (await this.emit(ev)) as ModelTurnRunEvent;
  }

  async emitRetrieval(input: {
    source: string;
    status: RetrievalStatus;
    querySummary?: string;
    hitCount?: number;
    timestamp?: string;
  }): Promise<RetrievalRunEvent> {
    if (!input.source.trim()) {
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.EMIT_RETRIEVAL_SOURCE_INVALID, "retrieval source must be non-empty.");
    }
    const ev: RetrievalRunEvent = {
      schemaVersion: 2,
      workflowId: this.workflowId,
      runEventId: randomUUID(),
      ...(this.parentRunEventId ? { parentRunEventId: this.parentRunEventId } : {}),
      type: "retrieval",
      source: input.source,
      status: input.status,
      ...(input.querySummary ? { querySummary: input.querySummary } : {}),
      ...(input.hitCount !== undefined ? { hitCount: input.hitCount } : {}),
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
    };
    return (await this.emit(ev)) as RetrievalRunEvent;
  }

  async emitControl(input: {
    controlKind: ControlKind;
    decision?: "taken" | "skipped";
    label?: string;
    timestamp?: string;
  }): Promise<ControlRunEvent> {
    const ev: ControlRunEvent = {
      schemaVersion: 2,
      workflowId: this.workflowId,
      runEventId: randomUUID(),
      ...(this.parentRunEventId ? { parentRunEventId: this.parentRunEventId } : {}),
      type: "control",
      controlKind: input.controlKind,
      ...(input.decision ? { decision: input.decision } : {}),
      ...(input.label ? { label: input.label } : {}),
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
    };
    return (await this.emit(ev)) as ControlRunEvent;
  }

  async emitToolSkipped(input: {
    toolId: string;
    reason: string;
    timestamp?: string;
  }): Promise<ToolSkippedRunEvent> {
    if (!input.toolId.trim()) {
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.EMIT_TOOL_ID_INVALID, "toolId must be non-empty.");
    }
    const ev: ToolSkippedRunEvent = {
      schemaVersion: 2,
      workflowId: this.workflowId,
      runEventId: randomUUID(),
      ...(this.parentRunEventId ? { parentRunEventId: this.parentRunEventId } : {}),
      type: "tool_skipped",
      toolId: input.toolId,
      reason: input.reason,
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
    };
    return (await this.emit(ev)) as ToolSkippedRunEvent;
  }

  async finalizeRun(timestamp?: string): Promise<ControlRunEvent> {
    return this.emitControl({ controlKind: "run_completed", timestamp });
  }
}
