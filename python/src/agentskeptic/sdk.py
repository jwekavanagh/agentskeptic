"""AgentSkeptic v2 `AgentSkeptic` facade (Python)."""

from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Literal

from agentskeptic.verify import verify as verify_cm

FrameworkName = Literal["crewai", "langgraph"]


class AgentSkeptic:
    """Bundles registry + database defaults for `verify()` and future HTTP helpers."""

    def __init__(
        self,
        *,
        registry_path: str | Path,
        database_url: str,
        api_key: str | None = None,
    ) -> None:
        self.registry_path = Path(registry_path)
        self.database_url = database_url
        self.api_key = api_key

    @contextmanager
    def verify(
        self,
        *,
        framework: FrameworkName,
        workflow_id: str,
        **kwargs: Any,
    ) -> Iterator[Any]:
        kwargs.setdefault("registry", self.registry_path)
        kwargs.setdefault("database_url", self.database_url)
        with verify_cm(framework=framework, workflow_id=workflow_id, **kwargs) as session:
            yield session
