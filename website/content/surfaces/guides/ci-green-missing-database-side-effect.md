---
surfaceKind: guide
guideJob: problem
title: CI green but missing database side effect — AgentSkeptic
description: CI can stay green on workflow logs while the database side effect is missing until a read-only gate surfaces ROW_ABSENT before production.
intent: Release managers who need CI to fail when persisted side effects never landed despite green workflow logs.
valueProposition: You attach structured observations to the job and fail on inconsistent workflow JSON instead of trusting pipeline tiles alone.
primaryCta: integrate
route: /guides/ci-green-missing-database-side-effect
evaluatorLens: false
---

# CI green but missing database side effect

CI can stay green on workflow logs while the database side effect is missing until a read-only gate surfaces ROW_ABSENT before production

Treat CI success as incomplete without read-only verification against the same database your integration path uses in replay.

Emit structured tool observations from the workflow under test and fail the job when AgentSkeptic reports inconsistent with ROW_ABSENT.

Pair verification artifacts with change records so reviewers see expected versus observed rows, not only green pipeline tiles.

Release managers should treat ROW_ABSENT as a hard stop on merge when the integration database in CI differs from the replayed workflow parameters, because pipeline green alone does not prove the side effect landed where finance and support will look next.

## What to do next

- Wire verification using [`/integrate`](/integrate) in your CI job.
- Compare bundled ROW_ABSENT at [`/examples/wf-missing`](/examples/wf-missing).
- Read pricing for commercial CI fixtures at [`/pricing`](/pricing).
- Confirm trust posture on [`/security`](/security).
