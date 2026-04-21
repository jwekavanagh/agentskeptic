---
surfaceKind: guide
guideJob: problem
title: Verify LangGraph workflows against your database — AgentSkeptic
description: Map LangGraph-style structured tool activity to NDJSON events, run read-only SQL verification, and understand ROW_ABSENT when traces look green.
intent: Teams running LangGraph or similar graphs who need Postgres or SQLite rows to match structured tool parameters at verification time.
valueProposition: You get a concrete separation between trace success flags and read-only SELECT results, with stable bundled examples for ROW_ABSENT.
primaryCta: integrate
route: /guides/verify-langgraph-workflows
evaluatorLens: false
---

# Verify LangGraph workflows against your database

LangGraph runs produce structured tool parameters; traces and success flags do not prove the Postgres or SQLite row exists with the values your graph implied at verification time.

AgentSkeptic compares that **declared** activity to **observed** SQLite or Postgres rows using read-only `SELECT`s—not trace success flags.

Read the LangGraph reference README for integrator-owned emitter guidance: [examples/langgraph-reference/README.md](https://github.com/jwekavanagh/agentskeptic/blob/main/examples/langgraph-reference/README.md).

Export or capture **structured tool activity** (JSON or NDJSON) from your graph run—the same shapes you would feed to Quick Verify or contract verification (see `/integrate` for activation commands below). Maintain a **tools registry** mapping `toolId` to SQL row checks for contract mode, or start with Quick Verify for inferred checks. Run `agentskeptic verify` or `agentskeptic quick` locally. To publish a **private** HTML artifact for Slack or tickets, pass `--share-report-origin https://agentskeptic.com` (replace with your deployment origin when self-hosting). Those `/r/…` URLs are **noindex** by design so they are not used for organic discovery. For **indexable** discovery pages that explain the trace-vs-database gap, use [`/guides#bundled-proof`](/guides#bundled-proof) (bundled proof examples), the Learn hub at [`/guides`](/guides), and the acquisition page at [`/database-truth-vs-traces`](/database-truth-vs-traces)—not `/r/` links.

Normative contracts: [docs/shareable-verification-reports.md](https://github.com/jwekavanagh/agentskeptic/blob/main/docs/shareable-verification-reports.md).

## What to do next

- Run first-run on your database via [`/integrate`](/integrate).
- Open pricing when you need metered commercial usage at [`/pricing`](/pricing).
- Compare bundled envelopes at [`/examples/wf-complete`](/examples/wf-complete) and [`/examples/wf-missing`](/examples/wf-missing).
- Read trust boundaries on [`/security`](/security).
