---
surfaceKind: scenario
guideJob: problem
title: If Stripe returns 200 but ledger rows disagree — AgentSkeptic
description: Failure-led scenario for webhook success responses without matching ledger database rows at verification time.
intent: Finance engineers reconciling Stripe webhooks against internal ledger tables before settlement.
valueProposition: You capture structured handler parameters and compare them to read-only SQL before money workflows continue.
primaryCta: pricing
route: /guides/scenario-stripe-webhook-ledger-mismatch
evaluatorLens: false
symptomLead: If Stripe returns HTTP 200 on the webhook while your ledger table still shows the prior balance at verification time
---

# If Stripe returns 200 but ledger rows disagree

If Stripe returns HTTP 200 on the webhook while your ledger table still shows the prior balance at verification time, HTTP status is not settlement truth. Record structured parameters from the webhook path, map them to read-only row checks, and block downstream money movement when AgentSkeptic reports inconsistent results.

## What to do next

- Read commercial terms on [`/pricing`](/pricing) before enabling metered verification.
- Follow [`/integrate`](/integrate) to align registry rules with finance tables.
- Compare bundled proof at [`/examples/wf-complete`](/examples/wf-complete).
- Review [`/security`](/security) for credential handling on finance databases.
