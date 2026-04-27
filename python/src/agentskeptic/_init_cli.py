"""`python -m agentskeptic init` (SQLite + none or next stubs; requires --yes in v2.0)."""

from __future__ import annotations

import argparse
import shutil
import sqlite3
from pathlib import Path


def run_init(argv: list[str]) -> None:
    p = argparse.ArgumentParser(description="Scaffold AgentSkeptic starter files.")
    p.add_argument("--framework", choices=["none", "next"], required=True)
    p.add_argument("--database", default="sqlite", choices=["sqlite"])
    p.add_argument("--yes", action="store_true")
    p.add_argument("--force", action="store_true")
    args = p.parse_args(argv)

    if not args.yes:
        print("Pass --yes for non-interactive mode (required in v2.0).", flush=True)
        raise SystemExit(2)

    here = Path(__file__).resolve().parent
    repo_root = here.parents[2]
    examples = repo_root / "examples"
    if not (examples / "tools.json").is_file():
        print("Could not locate examples/tools.json relative to package; use a release checkout.", flush=True)
        raise SystemExit(3)

    root = Path.cwd()
    agentskeptic_dir = root / "agentskeptic"
    if agentskeptic_dir.exists() and not args.force:
        print("agentskeptic/ exists; use --force to overwrite.", flush=True)
        raise SystemExit(2)

    agentskeptic_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy(examples / "tools.json", agentskeptic_dir / "tools.json")
    shutil.copy(examples / "events.ndjson", agentskeptic_dir / "events.ndjson")

    db = root / "demo.db"
    if db.exists() and not args.force:
        print("demo.db exists; use --force to overwrite.", flush=True)
        raise SystemExit(2)
    seed_sql = (examples / "seed.sql").read_text(encoding="utf-8")
    conn = sqlite3.connect(db)
    conn.executescript(seed_sql)
    conn.close()
    # minimal: user should re-seed via node init or sqlite3; print instructions
    (root / "AGENTSKEPTIC-INIT.md").write_text(
        "# Python init\n\n"
        "This quick scaffold copied `agentskeptic/tools.json` and `events.ndjson`.\n"
        "Create a seeded SQLite DB (see repository `examples/seed.sql`) as `demo.db`, then run verification via the npm CLI "
        "or follow docs/integrate.md.\n",
        encoding="utf-8",
    )

    if args.framework == "next":
        (root / "AGENTSKEPTIC-NEXT.md").write_text(
            "Use the TypeScript `agentskeptic init --framework next` for a Next.js route, or integrate manually (docs/integrate.md).\n",
            encoding="utf-8",
        )

    print(f"Scaffolded under {root}. See AGENTSKEPTIC-INIT.md", flush=True)


def run_migrate(argv: list[str]) -> None:
    print("agentskeptic migrate (Python): use docs/migrate-2.md; optional libcst codemods TBD.", flush=True)
    raise SystemExit(0)


def main(argv: list[str] | None = None) -> None:
    import sys

    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        print("Usage: python -m agentskeptic init|migrate ...", flush=True)
        raise SystemExit(2)
    if argv[0] == "init":
        run_init(argv[1:])
    elif argv[0] == "migrate":
        run_migrate(argv[1:])
    else:
        print("Unknown command; use init or migrate.", flush=True)
        raise SystemExit(2)
