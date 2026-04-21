---
surfaceKind: guide
guideJob: problem
title: CI green logs, row absent — AgentSkeptic
description: CI can pass on replayed logs while the integration database never received the side effect; fail jobs on read-only ROW_ABSENT instead of curl mocks alone.
intent: Engineers who need pipeline truth to include persisted rows, not only exit code zero on synthetic HTTP fixtures.
valueProposition: You treat structured tool observations plus registry rules as the contract that fails the build when rows are missing.
primaryCta: integrate
route: /guides/ci-green-logs-row-absent
evaluatorLens: false
---

# CI green logs, row absent

CI passed on workflow logs; database side effect never showed up

CI can pass on log replay or synthetic success while the integration database never received the side effect you assumed. Pipeline fixtures and mocked stores hide that until production. Read-only verification closes the loop on the real database you point at during the job.

Emit structured tool observations from the workflow under test, keep a registry aligned with migration truth, and fail the job when AgentSkeptic returns inconsistent with ROW_ABSENT. That is a different signal from exit code zero on curl mocks: it is state alignment, not proof that a particular HTTP request executed.

Pair this with assurance manifests for multi-scenario sweeps when you need time-bounded freshness on saved reports. The commercial npm path adds enforce and CI lock fixtures; OSS verify stays local without a license server for snapshot checks.

Treat verification artifacts as part of the audit trail: attach JSON workflow results and human truth reports to the change record so reviewers see expected versus observed, not only green pipeline tiles.

## What to do next

- Mirror the integrate spine on [`/integrate`](/integrate) for reproducible CI wiring.
- Compare ROW_ABSENT language on [`/examples/wf-missing`](/examples/wf-missing).
- Share acquisition context from [`/database-truth-vs-traces`](/database-truth-vs-traces) with reviewers.
- Read [`/security`](/security) before you attach production credentials to CI jobs.
