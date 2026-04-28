import type { RunEvent } from "../../types.js";

export type EventSink = {
  write(event: RunEvent): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
};

export type EventEmitterInit = {
  workflowId: string;
  sink: EventSink;
  /**
   * Default schema version for emitted tool_observed rows unless a specific
   * emission method requires a different version.
   */
  defaultToolObservedSchemaVersion?: 1 | 2;
};

export type ModelTurnStatus = "completed" | "error" | "aborted" | "incomplete";
export type RetrievalStatus = "ok" | "empty" | "error";
export type ControlKind = "branch" | "loop" | "interrupt" | "gate" | "run_completed";
