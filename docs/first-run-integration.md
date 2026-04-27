# First-run integration (SSOT)

The v2 integrator **SSOT** is [`integrate.md`](integrate.md). This file keeps the ordered adoption checklist, historical spine anchors, and commercial references for in-repo contract tests.

**Wedge / scar context (read first):** [Buy vs build (README)](../README.md#buy-vs-build-why-not-only-sql-checks).

Search token (tests): README.md#buy-vs-build-why-not-only-sql-checks

## Step 1: Run the local demo

```bash
npm start
```

**Commercial (hosted / licensed npm):** billing may use **Stripe**; set **`AGENTSKEPTIC_API_KEY`**; the license service uses **`POST /api/v1/usage/reserve`** before metered runs.

<!-- epistemic-contract:consumer:first-run-integration -->
**Epistemic framing (pointer only):** Normative epistemic definitions live only in [`epistemic-contract.md`](epistemic-contract.md). Operational four-way model, Decision-ready ProductionComplete, and commercial verdict semantics: [`adoption-epistemics.md`](adoption-epistemics.md).

**Throughput (operator, pointer only):** Metric SQL and ids: [`growth-metrics.md`](growth-metrics.md). Interpretation and proxies: [`epistemic-contract.md`](epistemic-contract.md). User outcome vs telemetry capture: [`funnel-observability.md`](funnel-observability.md). **Decision-ready ProductionComplete:** [`adoption-epistemics.md#decision-ready-productioncomplete-normative`](adoption-epistemics.md#decision-ready-productioncomplete-normative).
<!-- /epistemic-contract:consumer:first-run-integration -->

**Checklist IDs (naming from adoption spec):** **PatternComplete**, **AdoptionComplete_PatternComplete**, **AC-TRUST-01**, **AC-OPS-01**, **IntegrateSpineComplete**.

**Default path (operator):** [README default path](../README.md#default-path-decisiongate-before-you-act)

**Migrate:** [`migrate-2.md`](migrate-2.md)

## Step 2: Contract batch (`first-run-verify`)

```bash
npm run first-run-verify
```

## Step 3: Bootstrap fixture and `wf_bootstrap_fixture`

The activation shell uses a temp `--out` and a copied DB (`$ADOPT_DB`); the bootstrap input path is exactly:

`node dist/cli.js bootstrap --input test/fixtures/bootstrap-pack/input.json --db examples/demo.db --out "$OUT"`  
then `node dist/cli.js --workflow-id wf_bootstrap_fixture --events "$OUT/events.ndjson" --registry "$OUT/tools.json" --db "$ADOPT_DB"`.

## Step 4: Optional integrate spine and crossing

On your integrator database, run bootstrap and the pack-led **crossing** for `wf_integrate_spine` (see [crossing-normative.md](crossing-normative.md) and `scripts/templates/integrate-activation-shell.bash` on `main`).

---

The full L0 script **exit code is 0** iff every step completes, including the **final** `node dist/cli.js bootstrap … --input examples/integrate-your-db/bootstrap-input.json` and the following **`crossing`** pack-led on `"$AGENTSKEPTIC_VERIFY_DB"` (same event/registry/db flags as contract batch verify; integrator-owned gate per [`agentskeptic.md`](agentskeptic.md) Integrator-owned gate; final-phase telemetry matches **`verify_integrator_owned`** per [`crossing-normative.md`](crossing-normative.md)).
