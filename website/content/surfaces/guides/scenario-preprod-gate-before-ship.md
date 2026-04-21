---
surfaceKind: scenario
guideJob: problem
title: Before you ship refunds, traces look fine but rows are wrong — AgentSkeptic
description: Failure-led scenario for pre-production gates when high-stakes actions need read-only SQL confirmation.
intent: SRE and compliance reviewers blocking releases until persisted rows match structured tool claims.
valueProposition: You practice scheduling verification after replay when liability hinges on database truth.
primaryCta: integrate
route: /guides/scenario-preprod-gate-before-ship
evaluatorLens: false
symptomLead: After you enable customer-facing refunds the workflow trace reads complete yet the entitlement row is still wrong at verification time
---

# Before you ship refunds, traces look fine but rows are wrong

After you enable customer-facing refunds the workflow trace reads complete yet the entitlement row is still wrong at verification time, you need a pre-production read-only gate—not another latency tile. Schedule verification after replay, archive JSON workflow results with human reports, and treat ROW_ABSENT as a hard stop before release.

## What to do next

- Follow [`/integrate`](/integrate) to wire the gate on your staging database.
- Compare bundled proof at [`/examples/wf-complete`](/examples/wf-complete) and [`/examples/wf-missing`](/examples/wf-missing).
- Read adjacent guidance on [`/guides`](/guides).
- Review [`/security`](/security) before expanding SELECT scope.
