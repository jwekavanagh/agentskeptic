# First-run integration (moved)

The v2 integrator **SSOT** is [`integrate.md`](integrate.md). This file keeps historical checklist anchors and commercial references for in-repo contract tests.

**Wedge / scar context (read first):** [Buy vs build (README)](../README.md#buy-vs-build-why-not-only-sql-checks).

Search token (tests): README.md#buy-vs-build-why-not-only-sql-checks

```bash
npm start
```

**Commercial (hosted / licensed npm):** billing may use **Stripe**; set **`AGENTSKEPTIC_API_KEY`**; the license service uses **`POST /api/v1/usage/reserve`** before metered runs.

**Epistemic pointers:** adoption-epistemics.md, epistemic-contract.md (ranking and grounded-output rules).

**Checklist IDs (naming from adoption spec):** **PatternComplete**, **AdoptionComplete_PatternComplete**, **AC-TRUST-01**, **AC-OPS-01**, **IntegrateSpineComplete**.

**Default path (operator):** [README default path](../README.md#default-path-decisiongate-before-you-act)

**Migrate:** [`migrate-2.md`](migrate-2.md)

**Decision-ready ProductionComplete (normative):** [adoption-epistemics.md#decision-ready-productioncomplete-normative](adoption-epistemics.md#decision-ready-productioncomplete-normative)

---

The full L0 script **exit code is 0** iff every step completes, including the **final** `node dist/cli.js bootstrap … --input examples/integrate-your-db/bootstrap-input.json` and the following **`crossing`** pack-led on `"$AGENTSKEPTIC_VERIFY_DB"` (same event/registry/db flags as contract batch verify; integrator-owned gate per [`agentskeptic.md`](agentskeptic.md) Integrator-owned gate; final-phase telemetry matches **`verify_integrator_owned`** per [`crossing-normative.md`](crossing-normative.md)).
