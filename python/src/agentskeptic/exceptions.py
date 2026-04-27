"""Backward-compatible public errors; prefer `agentskeptic.errors.AgentSkepticError` in new code."""

from agentskeptic.errors import AgentSkepticError


class DecisionUnsafeError(AgentSkepticError):
    """Raised when verification blocks an irreversible action (contract_sql)."""

    def __init__(
        self,
        message: str,
        *,
        certificate: dict | None = None,
        code: str = "DECISION_UNSAFE",
    ) -> None:
        super().__init__(code, message)
        self.certificate = certificate


class LangGraphCheckpointTrustUnsafeError(AgentSkepticError):
    """Raised when LangGraph checkpoint production gate fails (row B not satisfied)."""

    def __init__(
        self,
        message: str,
        *,
        certificate: dict | None = None,
        code: str = "LANGGRAPH_CHECKPOINT_UNSAFE",
    ) -> None:
        super().__init__(code, message)
        self.certificate = certificate
