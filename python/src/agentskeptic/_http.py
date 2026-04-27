"""Hand-written httpx client for commercial activation (mirrors `src/sdk/transport.ts` surface)."""

from __future__ import annotations

import os
from typing import Any, Literal, cast

import httpx

from agentskeptic._models import ReserveRequest, UsageCurrentV1

Intent = Literal["verify", "enforce"]


def _base_url() -> str:
    base = os.environ.get("AGENTSKEPTIC_LICENSE_API_BASE_URL", "").strip() or os.environ.get(
        "NEXT_PUBLIC_APP_URL",
        "",
    ).strip()
    if not base:
        return ""
    return base.rstrip("/")


def resolve_api_key() -> str | None:
    a = os.environ.get("AGENTSKEPTIC_API_KEY", "").strip()
    b = os.environ.get("WORKFLOW_VERIFIER_API_KEY", "").strip()
    return a or b or None


def post_usage_reserve(
    *,
    intent: Intent,
    run_id: str,
    issued_at_iso: str,
    x_request_id: str,
    api_key: str,
) -> None:
    base = _base_url()
    if not base:
        return
    url = f"{base}/api/v1/usage/reserve"
    body = ReserveRequest(run_id=run_id, issued_at=issued_at_iso, intent=intent)
    with httpx.Client(timeout=30.0) as client:
        r = client.post(
            url,
            json=body.model_dump(exclude_none=True, mode="json"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "x-request-id": x_request_id,
            },
        )
    r.raise_for_status()


def get_usage_current() -> UsageCurrentV1:
    base = _base_url()
    if not base:
        raise RuntimeError("License API base URL is not configured for this build.")
    key = resolve_api_key()
    if not key:
        raise RuntimeError("AGENTSKEPTIC_API_KEY is required for usage queries.")
    url = f"{base}/api/v1/usage/current"
    with httpx.Client(timeout=30.0) as client:
        r = client.get(
            url,
            headers={"Authorization": f"Bearer {key}", "x-request-id": _new_request_id()},
        )
    r.raise_for_status()
    return cast(UsageCurrentV1, UsageCurrentV1.model_validate(r.json()))


def _new_request_id() -> str:
    import uuid

    return str(uuid.uuid4())
