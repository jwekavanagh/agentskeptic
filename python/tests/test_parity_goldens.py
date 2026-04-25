from __future__ import annotations

import json
import sqlite3
import tempfile
from pathlib import Path

import os
import pytest


def _repo_root() -> Path:
    env = os.environ.get("AGENTSKEPTIC_REPO_ROOT")
    if env:
        p = Path(env)
        if (p / "examples" / "partner-quickstart" / "partner.seed.sql").is_file():
            return p
    here = Path(__file__).resolve()
    for cand in here.parents:
        if (cand / "examples" / "partner-quickstart" / "partner.seed.sql").is_file():
            return cand
    raise RuntimeError(
        "Could not locate examples/partner-quickstart (run from repo root or set AGENTSKEPTIC_REPO_ROOT)",
    )


ROOT = _repo_root()
PARTNER = ROOT / "examples" / "partner-quickstart"
VECTORS = Path(__file__).resolve().parent / "parity_vectors"


def _seed_db(path: Path) -> None:
    sql = (PARTNER / "partner.seed.sql").read_text(encoding="utf8")
    conn = sqlite3.connect(str(path))
    try:
        conn.executescript(sql)
        conn.commit()
    finally:
        conn.close()


def _load_json(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf8"))


def _assert_langgraph_cert_core_match(got: dict, golden: dict) -> None:
    """Full byte match to Node CLI for humanReport is not guaranteed for C/D (workflow truth formatting)."""
    for k in (
        "schemaVersion",
        "workflowId",
        "runKind",
        "stateRelation",
        "highStakesReliance",
        "relianceRationale",
        "intentSummary",
        "steps",
        "checkpointVerdicts",
    ):
        assert got.get(k) == golden.get(k), k
    g_det = sorted(
        golden["explanation"]["details"],
        key=lambda x: (x.get("code", ""), x.get("message", "")),
    )
    t_det = sorted(
        got["explanation"]["details"],
        key=lambda x: (x.get("code", ""), x.get("message", "")),
    )
    assert g_det == t_det
    assert "langgraph_checkpoint_verdicts:" in got.get("humanReport", "")
    assert "langgraph_checkpoint_verdicts:" in golden.get("humanReport", "")


def test_partner_contract_sql_matches_golden() -> None:
    from agentskeptic.kernel.verify_sqlite import verify_contract_sql_certificate_sqlite

    golden = _load_json(VECTORS / "partner_contract_sql" / "golden_certificate.json")
    events_line = (PARTNER / "partner.events.ndjson").read_text(encoding="utf8").strip()
    ev = json.loads(events_line)
    with tempfile.TemporaryDirectory() as tmp:
        dbp = Path(tmp) / "db.sqlite"
        _seed_db(dbp)
        got = verify_contract_sql_certificate_sqlite(
            workflow_id="wf_partner",
            registry_path=PARTNER / "partner.tools.json",
            database_path=dbp,
            buffered_run_events=[ev],
            run_level_reasons=[],
        )
    assert got == golden


# Stable IDs must match scripts/regen-langgraph-embeds.mjs
_STABLE_B = "00000000-0000-4000-8000-00000000b0b0"
_STABLE_C = "00000000-0000-4000-8000-00000000c0c0"
_STABLE_D = "00000000-0000-4000-8000-00000000d0d0"


def _ev_b() -> dict:
    return {
        "schemaVersion": 3,
        "workflowId": "wf_partner",
        "runEventId": _STABLE_B,
        "type": "tool_observed",
        "seq": 0,
        "toolId": "crm.upsert_contact",
        "params": {"recordId": "partner_1", "fields": {"name": "You", "status": "active"}},
        "langgraphCheckpoint": {"threadId": "t-contract", "checkpointNs": "", "checkpointId": "cp-contract"},
    }


def _ev_c() -> dict:
    o = _ev_b()
    o["runEventId"] = _STABLE_C
    o["params"] = {"recordId": "wrong_id", "fields": {"name": "You", "status": "active"}}
    return o


def _ev_d() -> dict:
    o = _ev_b()
    o["runEventId"] = _STABLE_D
    o["toolId"] = "no.such.tool"
    return o


def test_langgraph_lct_a2_matches_golden() -> None:
    from agentskeptic.kernel.verify_sqlite import verify_langgraph_checkpoint_trust

    golden = _load_json(VECTORS / "langgraph_lct_a2" / "golden_certificate.json")
    rlr = [
        {
            "code": "MALFORMED_EVENT_LINE",
            "message": (
                "Event line was missing, invalid JSON, or failed schema validation for a tool observation."
            ),
        }
    ]
    with tempfile.TemporaryDirectory() as tmp:
        dbp = Path(tmp) / "p.db"
        _seed_db(dbp)
        got = verify_langgraph_checkpoint_trust(
            workflow_id="wf_partner",
            registry_path=PARTNER / "partner.tools.json",
            database_url=str(dbp),
            buffered_run_events=[],
            run_level_reasons=rlr,
        )
    assert got == golden


def test_langgraph_lct_b_matches_golden() -> None:
    from agentskeptic.kernel.verify_sqlite import verify_langgraph_checkpoint_trust

    golden = _load_json(VECTORS / "langgraph_lct_b" / "golden_certificate.json")
    with tempfile.TemporaryDirectory() as tmp:
        dbp = Path(tmp) / "p.db"
        _seed_db(dbp)
        got = verify_langgraph_checkpoint_trust(
            workflow_id="wf_partner",
            registry_path=PARTNER / "partner.tools.json",
            database_url=str(dbp),
            buffered_run_events=[_ev_b()],
            run_level_reasons=[],
        )
    assert got == golden


def test_langgraph_lct_c_matches_golden() -> None:
    from agentskeptic.kernel.verify_sqlite import verify_langgraph_checkpoint_trust

    golden = _load_json(VECTORS / "langgraph_lct_c" / "golden_certificate.json")
    with tempfile.TemporaryDirectory() as tmp:
        dbp = Path(tmp) / "p.db"
        _seed_db(dbp)
        got = verify_langgraph_checkpoint_trust(
            workflow_id="wf_partner",
            registry_path=PARTNER / "partner.tools.json",
            database_url=str(dbp),
            buffered_run_events=[_ev_c()],
            run_level_reasons=[],
        )
    _assert_langgraph_cert_core_match(got, golden)


def test_langgraph_lct_d_matches_golden() -> None:
    from agentskeptic.kernel.verify_sqlite import verify_langgraph_checkpoint_trust

    golden = _load_json(VECTORS / "langgraph_lct_d" / "golden_certificate.json")
    with tempfile.TemporaryDirectory() as tmp:
        dbp = Path(tmp) / "p.db"
        _seed_db(dbp)
        got = verify_langgraph_checkpoint_trust(
            workflow_id="wf_partner",
            registry_path=PARTNER / "partner.tools.json",
            database_url=str(dbp),
            buffered_run_events=[_ev_d()],
            run_level_reasons=[],
        )
    _assert_langgraph_cert_core_match(got, golden)


def test_langgraph_lct_b_sqlite_and_postgres_match_when_postgres_available() -> None:
    from agentskeptic.kernel.verify_postgres import verify_langgraph_checkpoint_trust_postgres
    from agentskeptic.kernel.verify_sqlite import verify_langgraph_checkpoint_trust_sqlite

    try:
        import psycopg  # type: ignore[import-untyped]
    except ImportError:  # pragma: no cover
        pytest.skip("psycopg not installed (pip install agentskeptic[postgres])")

    url = os.environ.get("AGENTSKEPTIC_POSTGRES_LCT_URL", "").strip()
    if not url:
        pytest.skip("Set AGENTSKEPTIC_POSTGRES_LCT_URL for postgres parity (CI provides it)")

    sql = (PARTNER / "partner.seed.sql").read_text(encoding="utf8")
    try:
        with psycopg.connect(url) as c:
            with c.cursor() as cur:
                cur.execute("DROP TABLE IF EXISTS contacts")
                for part in (x.strip() for x in sql.split(";")):
                    if part:
                        cur.execute(part)
            c.commit()
    except Exception as e:  # noqa: BLE001
        pytest.skip(f"Postgres at AGENTSKEPTIC_POSTGRES_LCT_URL not available: {e!s}")

    with tempfile.TemporaryDirectory() as tmp:
        dbp = Path(tmp) / "p.db"
        _seed_db(dbp)
        ev = _ev_b()
        got_sqlite = verify_langgraph_checkpoint_trust_sqlite(
            workflow_id="wf_partner",
            registry_path=PARTNER / "partner.tools.json",
            database_path=dbp,
            buffered_run_events=[ev],
            run_level_reasons=[],
        )
    got_pg = verify_langgraph_checkpoint_trust_postgres(
        workflow_id="wf_partner",
        registry_path=PARTNER / "partner.tools.json",
        database_url=url,
        buffered_run_events=[ev],
        run_level_reasons=[],
    )
    assert got_sqlite == got_pg
