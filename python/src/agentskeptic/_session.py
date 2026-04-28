from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from agentskeptic.events import CanonicalEventEmitter
from agentskeptic.kernel.verify_sqlite import (
    verify_contract_sql_certificate_sqlite,
    verify_langgraph_checkpoint_trust,
)


class VerificationSession:
    """Buffers tool_observed events and flushes to the Python kernel."""

    def __init__(
        self,
        *,
        framework: str,
        workflow_id: str,
        database_url: str,
        registry: str | Path,
    ) -> None:
        self.framework = framework
        self.workflow_id = workflow_id
        self.database_url = database_url
        self.registry = Path(registry)
        self.buffered: list[dict[str, Any]] = []
        self.run_level_reasons: list[dict[str, Any]] = []
        self._root_run_event_id = str(uuid.uuid4())
        self.emitter = CanonicalEventEmitter(workflow_id=workflow_id, default_tool_schema_version=1)
        self.last_certificate: dict[str, Any] | None = None

    def append_malformed(self, reason: dict[str, Any]) -> None:
        self.run_level_reasons.append(reason)

    def append_tool_v1(self, tool_id: str, params: dict[str, Any]) -> None:
        ev = self.emitter.tool_observed(tool_id=tool_id, params=params, schema_version=1)
        self.buffered.append(ev)

    def append_tool_v3_langgraph(
        self,
        tool_id: str,
        params: dict[str, Any],
        *,
        thread_id: str,
        checkpoint_ns: str,
        checkpoint_id: str,
    ) -> None:
        ev = self.emitter.tool_observed_langgraph_checkpoint(
            tool_id=tool_id,
            params=params,
            thread_id=thread_id,
            checkpoint_ns=checkpoint_ns,
            checkpoint_id=checkpoint_id,
        )
        self.buffered.append(ev)

    def flush_certificate(self) -> dict[str, Any]:
        db = self.database_url
        if self.framework == "langgraph":
            cert = verify_langgraph_checkpoint_trust(
                workflow_id=self.workflow_id,
                registry_path=self.registry,
                database_url=db,
                buffered_run_events=self.buffered,
                run_level_reasons=self.run_level_reasons,
            )
        else:
            cert = verify_contract_sql_certificate_sqlite(
                workflow_id=self.workflow_id,
                registry_path=self.registry,
                database_path=db,
                buffered_run_events=self.buffered,
                run_level_reasons=self.run_level_reasons,
            )
        self.last_certificate = cert
        return cert
