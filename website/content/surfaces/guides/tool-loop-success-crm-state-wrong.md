---
surfaceKind: guide
guideJob: problem
title: Tool loop success, CRM state wrong — AgentSkeptic
description: OpenAI-style tool loops return success-shaped messages while CRM or SQLite rows disagree; verify with read-only SQL at verification time.
intent: Teams integrating assistant tool loops against CRM or internal tables where user-visible success strings diverge from durable rows.
valueProposition: You map declared parameters to SELECT results so missing identities show ROW_ABSENT instead of silent drift.
primaryCta: integrate
route: /guides/tool-loop-success-crm-state-wrong
evaluatorLens: false
---

# Tool loop success, CRM state wrong

OpenAI-style tool loop reported success; CRM or SQLite state does not match

OpenAI-style tool loops return assistant messages that look authoritative. Your integration layer may still skip a write, hit a retry boundary, or persist the wrong shard. The user-visible success string is not the same object as a durable CRM or SQLite row that matches tool parameters.

AgentSkeptic compares declared tool parameters from structured activity to read-only SELECT results. When the expected identity is absent, you see ROW_ABSENT in the workflow result alongside the human truth report. That is the wedge between narrative success and database truth at verification time.

Map each toolId in your registry to sql_row or relational rules, emit one NDJSON line per observation, and run verify against the same database your production path uses in a replay or shadow read. Quick Verify can bootstrap inferred checks when you are still shaping the registry.

This guide uses the same bundled missing-row fixture as other guides so the ROW_ABSENT contrast stays stable across docs and tests. Replace fixtures only after redaction when you publish a new public case; never index raw /r/ links for organic discovery because payloads may contain secrets.

## What to do next

- Wire first-run on [`/integrate`](/integrate) before you expand registry coverage.
- Compare bundled proof at [`/examples/wf-missing`](/examples/wf-missing) for ROW_ABSENT language.
- Read pricing for metered tiers at [`/pricing`](/pricing) when you graduate from OSS-only checks.
- Confirm data handling on [`/security`](/security).
