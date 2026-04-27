# Framework integration lock

Pinned third-party versions are enforced in CI via optional dependency installs. Import paths below must remain importable when those extras are installed.

## CrewAI

- **Packages**: `crewai` (see `pyproject.toml` `[project.optional-dependencies].crewai`).
- **Hook surface**: `crewai.hooks.before_tool_call` — register a global hook for the duration of `agentskeptic.verify()`.
- **Trust boundary**: `before_tool_call` (parameters visible before tool side effects).
- **Rejected alternatives**: crew-scoped decorators only (we use global registration scoped by context manager lifetime).

## LangGraph (Python)

- **Packages**: `langgraph`, `langchain-core` (optional extra `langgraph`).
- **Hook surface**: **Wrapped checkpointer** — subclass/wrapper delegating to the user’s `BaseCheckpointSaver` and capturing `(thread_id, checkpoint_ns, checkpoint_id)` on `put` / `put_writes` when available.
- **Trust boundary**: after checkpoint materialization (same tuple as persisted checkpoint).
- **Rejected alternatives**: `ToolNode` monkeypatch; requiring users to edit every `@tool` body.

## Version pins (minimum tested)

| Package | Minimum |
|---------|---------|
| `crewai` | 0.80.0 |
| `langgraph` | 0.2.0 |
| `langchain-core` | 0.3.0 |

AutoGen integration was removed in AgentSkeptic Python 2.0; a future release may reintroduce it with pinned upstream versions and tests.
