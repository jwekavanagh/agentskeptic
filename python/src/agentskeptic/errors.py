"""Unified AgentSkeptic error model (v2); codes mirror agentskeptic_error_codes.json."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_PKG = Path(__file__).resolve().parent


def _load_entries() -> list[dict[str, Any]]:
    data = json.loads((_PKG / "agentskeptic_error_codes.json").read_text(encoding="utf-8"))
    return list(data["entries"])


_META: dict[str, dict[str, Any]] = {}
for _row in _load_entries():
    _META[str(_row["code"])] = _row

# All known machine codes (for parity tests)
AGENT_SKEPTIC_ERROR_CODES: tuple[str, ...] = tuple(sorted(_META.keys()))


class AgentSkepticError(Exception):
    """Unified error with stable `code`, `category`, and optional remediation."""

    def __init__(self, code: str, message: str, *, request_id: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        meta = _META.get(code, {})
        self.category = str(meta.get("category", "unknown"))
        self.retryable = bool(meta.get("retryable", False))
        self.remediation = meta.get("remediation")
        self.request_id = request_id
