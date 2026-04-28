from __future__ import annotations

import uuid
from typing import Any


class CanonicalEventEmitter:
    """Canonical event emitter for faithful run-event production."""

    def __init__(self, *, workflow_id: str, default_tool_schema_version: int = 1) -> None:
        if not workflow_id.strip():
            raise ValueError("workflow_id must be non-empty")
        if default_tool_schema_version not in (1, 2):
            raise ValueError("default_tool_schema_version must be 1 or 2")
        self.workflow_id = workflow_id
        self.default_tool_schema_version = default_tool_schema_version
        self._seq = 0
        self._parent_run_event_id: str | None = None

    def _next_seq(self) -> int:
        seq = self._seq
        self._seq += 1
        return seq

    def _with_parent(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self._parent_run_event_id:
            payload["parentRunEventId"] = self._parent_run_event_id
        return payload

    def _capture_parent(self, event: dict[str, Any]) -> None:
        rid = event.get("runEventId")
        if isinstance(rid, str) and rid:
            self._parent_run_event_id = rid

    def tool_observed(
        self,
        *,
        tool_id: str,
        params: dict[str, Any],
        timestamp: str | None = None,
        schema_version: int | None = None,
    ) -> dict[str, Any]:
        sv = self.default_tool_schema_version if schema_version is None else schema_version
        if sv == 1:
            ev: dict[str, Any] = {
                "schemaVersion": 1,
                "workflowId": self.workflow_id,
                "seq": self._next_seq(),
                "type": "tool_observed",
                "toolId": tool_id,
                "params": params,
            }
            if timestamp:
                ev["timestamp"] = timestamp
            return ev
        if sv == 2:
            ev = self._with_parent(
                {
                    "schemaVersion": 2,
                    "workflowId": self.workflow_id,
                    "runEventId": str(uuid.uuid4()),
                    "seq": self._next_seq(),
                    "type": "tool_observed",
                    "toolId": tool_id,
                    "params": params,
                }
            )
            if timestamp:
                ev["timestamp"] = timestamp
            self._capture_parent(ev)
            return ev
        raise ValueError("schema_version must be 1 or 2 for tool_observed")

    def tool_observed_langgraph_checkpoint(
        self,
        *,
        tool_id: str,
        params: dict[str, Any],
        thread_id: str,
        checkpoint_ns: str,
        checkpoint_id: str,
        timestamp: str | None = None,
    ) -> dict[str, Any]:
        ev = self._with_parent(
            {
                "schemaVersion": 3,
                "workflowId": self.workflow_id,
                "runEventId": str(uuid.uuid4()),
                "seq": self._next_seq(),
                "type": "tool_observed",
                "toolId": tool_id,
                "params": params,
                "langgraphCheckpoint": {
                    "threadId": thread_id,
                    "checkpointNs": checkpoint_ns,
                    "checkpointId": checkpoint_id,
                },
            }
        )
        if timestamp:
            ev["timestamp"] = timestamp
        self._capture_parent(ev)
        return ev
