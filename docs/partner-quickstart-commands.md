# Partner quickstart (moved)

**First run:** follow **[`docs/integrate.md`](integrate.md)** and [`first-run-integration.md`](first-run-integration.md); use `npx agentskeptic init` for the v2 scaffolder when you are ready to embed the gate in your app.

Command-line quickstarts for partners are aligned with the v2 scaffolder; start from **[`docs/integrate.md`](integrate.md)** and `agentskeptic init`.

## LangGraph reference

Batch / CI verify must pass **`--langgraph-checkpoint-trust`** when your command line exercises the LangGraph checkpoint trust surface (see [`docs/agentskeptic.md`](agentskeptic.md) and the CLI help for that flag). Do not use legacy v1 “single-line NDJSON” product paths; use schemaVersion 2 run events and the in-repo reference harness when refreshing goldens.
