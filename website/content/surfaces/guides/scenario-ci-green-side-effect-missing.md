---
surfaceKind: scenario
guideJob: problem
title: After CI passes, the database side effect never landed — AgentSkeptic
description: Failure-led scenario for pipelines that stay green on logs while persisted integration rows are absent until read-only verification.
intent: CI owners debugging green builds that still shipped missing database effects.
valueProposition: You attach structured observations to the job and fail on ROW_ABSENT instead of trusting exit codes alone.
primaryCta: integrate
route: /guides/scenario-ci-green-side-effect-missing
evaluatorLens: false
symptomLead: After CI prints green workflow logs your integration tests never observed the finance or CRM row that should have been written
---

# After CI passes, the database side effect never landed

After CI prints green workflow logs your integration tests never observed the finance or CRM row that should have been written, you are in the CI-green, row-absent class. Emit structured tool observations from the workflow under test, keep a registry aligned with migrations, and fail the job when AgentSkeptic returns inconsistent with ROW_ABSENT.

## What to do next

- Wire verification using [`/integrate`](/integrate) in the same job image you ship.
- Compare ROW_ABSENT language on [`/examples/wf-missing`](/examples/wf-missing).
- Read pricing for enforce fixtures at [`/pricing`](/pricing).
- Review [`/security`](/security) before attaching production credentials.
