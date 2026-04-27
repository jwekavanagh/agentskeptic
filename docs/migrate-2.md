# Migrating to AgentSkeptic v2

## Deprecation policy

- **2.0** ships `AgentSkeptic` + `AgentSkepticError` as the recommended API.
- Legacy exports (`createDecisionGate`, `verifyWorkflow`, `verifyAgentskeptic`, `runQuickVerify`, `runQuickVerifyToValidatedReport`, LangGraph trust gate helpers, and Python `verify()`) remain **behavior-compatible** but emit one deprecation notice per process (`AGENTSKEPTIC_SUPPRESS_DEPRECATION=1` to silence).
- **3.0 (future)** may remove deprecated symbols after telemetry shows low usage.

## Symbol mapping

| Legacy | Replacement |
|--------|-------------|
| `createDecisionGate({ workflowId, registryPath, databaseUrl, … })` | `new AgentSkeptic({ registryPath, databaseUrl, … }).gate({ workflowId })` |
| `verifyWorkflow({ … })` | `new AgentSkeptic({ registryPath, databaseUrl }).verify({ … })` (same options object) |
| `verifyAgentskeptic({ workflowId, databaseUrl, projectRoot })` | `new AgentSkeptic({ registryPath: "agentskeptic/tools.json", databaseUrl, projectRoot }).replayFromFile({ workflowId })` |
| `runQuickVerify(opts)` | `new AgentSkeptic({ … }).quick(opts)` |
| `TruthLayerError` | `AgentSkepticError` (TruthLayerError remains an alias subclass) |
| Python `verify(...)` | `with AgentSkeptic(...).verify(...)` as context manager |

## Automation

```bash
agentskeptic migrate .            # report deprecated call sites
agentskeptic migrate . --write      # append one-time file markers (conservative; no full AST rewrite yet)
```

```bash
python -m agentskeptic migrate      # pointer only today; follow this document for manual edits
```

## Support window

The **1.x** npm line receives **security** patches for at least six months after 2.0.0; feature development is on 2.x.
