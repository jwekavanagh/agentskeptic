---
surfaceKind: scenario
guideJob: problem
title: When the agent says CRM updated but SELECT disagrees — AgentSkeptic
description: Failure-led scenario for AI agent paths that report success while read-only SQL shows missing or wrong CRM rows.
intent: Support teams chasing silent CRM drift after agent runs with green dashboards.
valueProposition: You rehearse capturing NDJSON observations and failing closed before customer-visible fields diverge.
primaryCta: integrate
route: /guides/scenario-agent-crm-silent-drift
evaluatorLens: false
symptomLead: When your agent chat claims the CRM contact was updated but read-only SQL still shows the old fields at verification time
---

# When the agent says CRM updated but SELECT disagrees

When your agent chat claims the CRM contact was updated but read-only SQL still shows the old fields at verification time, dashboards can stay green while customers see stale data. Capture structured tool activity from the CRM path, map toolIds to registry rules, and run read-only verification before you trust customer-visible state.

## What to do next

- Use [`/integrate`](/integrate) to reproduce the CRM verification path locally.
- Compare ROW_ABSENT at [`/examples/wf-missing`](/examples/wf-missing).
- Read acquisition framing at [`/database-truth-vs-traces`](/database-truth-vs-traces).
- Confirm data handling on [`/security`](/security).
