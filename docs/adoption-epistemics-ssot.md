# Adoption epistemics — single source of truth

This document is the **SSOT** for **what the repository can prove versus what only integrators or operators can prove**, and for **how to read committed validation artifacts** without conflating CI coverage with market funnel performance.

**Normative detail elsewhere (do not duplicate here):**

- **HTTP semantics, beacon shapes, and `funnel_event` ingestion** — [`funnel-observability-ssot.md`](funnel-observability-ssot.md)
- **Metric ids, SQL, denominators, numerators, and explicit prohibitions** — [`growth-metrics-ssot.md`](growth-metrics-ssot.md)
- **PatternComplete checklist, IntegrateSpineComplete, Step 4 ProductionComplete commands** — [`first-run-integration.md`](first-run-integration.md)
- **Commercial billing, Stripe, `POST /api/v1/usage/reserve`** — [`commercial-ssot.md`](commercial-ssot.md)

## Four-way model (structural truth)

Four different notions are often conflated. They are **not interchangeable**.

| Layer | What it proves | Primary evidence in this repo |
|-------|----------------|--------------------------------|
| **PatternComplete** | Mechanical contract `verify` on **temp** artifact paths and a **SQLite DB copy under the OS temp directory** (not bundled example paths on the verify invocation); checklist IDs `AC-TRUST-*` / `AC-OPS-*`. | `node scripts/validate-adoption-complete.mjs` → [`artifacts/adoption-complete-validation-verdict.json`](../artifacts/adoption-complete-validation-verdict.json) |
| **IntegrateSpineComplete** | Full L0 bash from [`scripts/templates/integrate-activation-shell.bash`](../scripts/templates/integrate-activation-shell.bash): demo + mid-script PatternComplete-shaped segment + **final** bootstrap and contract `verify` on integrator-supplied `AGENTSKEPTIC_VERIFY_DB` (final verify may **not** satisfy AC-OPS-03 by design). | `node scripts/validate-integrate-spine.mjs` → [`artifacts/integrate-spine-validation-verdict.json`](../artifacts/integrate-spine-validation-verdict.json) |
| **ProductionComplete** | Contract verification (and/or bootstrap) against **the integrator’s** authoritative SQLite or Postgres and **their** structured tool activity / registry—ongoing ownership. | **Not** asserted by default `npm test`. Satisfied only when the integrator completes [Step 4](first-run-integration.md#step-4-bootstrap-when-you-have-your-own-tool_calls-and-a-db-url) (or equivalent) per [`first-run-integration.md`](first-run-integration.md). |
| **Telemetry KPIs** | **Operator observation** of anonymous or licensed beacons in Postgres—correlation and rolling rates per [`growth-metrics-ssot.md`](growth-metrics-ssot.md). | Production telemetry DB + queries; **not** proof of user-side correctness (see [User outcome vs telemetry capture](funnel-observability-ssot.md#user-outcome-vs-telemetry-capture-operator)). |

**Structural vs empirical:** The four-way table above is **structural** (definitions and repo proofs). **Where users drop off in production** is **empirical** and requires time-bounded data from telemetry and product analytics; that evidence is **not** committed in this repository.

## Commercial validation verdict (`artifacts/commercial-validation-verdict.json`)

Written by [`scripts/validate-commercial-funnel.mjs`](../scripts/validate-commercial-funnel.mjs).

### `layers.regression`

**True** when the script successfully completed the **regression** portion of commercial validation (commercial plans SSOT, builds, website Vitest harness steps, pack-smoke, registry-draft harness, OSS restore, etc.—see script body). **False** if the script exited before marking regression complete.

### `layers.playwrightCommercialE2e`

**True** only when **`COMMERCIAL_VALIDATE_PLAYWRIGHT=1`** and the Playwright suite (`playwright.commercial.config.ts`) **exits successfully** inside that same script run.

**False** when Playwright was **not** run (default) or when Playwright failed.

**This boolean is not a market funnel metric.** It does **not** measure acquisition conversion, integrate conversion, or revenue. It names **whether optional browser-level commercial E2E tests ran and passed** in that validation invocation.

**One-sentence reader rule:** `playwrightCommercialE2e: false` means “Playwright commercial E2E was not executed successfully in this `validate-commercial-funnel` run (usually because `COMMERCIAL_VALIDATE_PLAYWRIGHT` was unset),” **not** “the business funnel failed.”

### `COMMERCIAL_REQUIRE_LAYER2`

When set to **`1`**, the script requires **`layers.playwrightCommercialE2e === true`** for final `status: solved`. That is a **Playwright coverage gate**, not a North Star KPI gate.

## ProductionComplete cohort checklist (operator)

Use this checklist when a human operator assists an integrator to reach **ProductionComplete** outside CI. **Completion** means every item is satisfied and **artifacts** (stdout JSON paths or equivalent) are retained by the integrator or operator for their records.

1. ** Preconditions:** Integrator has **structured tool activity** (NDJSON or bootstrap-capable `tool_calls` input) and **read-only** access to **their** SQLite or Postgres per [`verification-product-ssot.md`](verification-product-ssot.md) ICP.
2. **Trust doctrine:** Integrator has read [What this does not prove](verification-product-ssot.md#what-this-does-not-prove-trust-boundary) and [Quick Verify positioning](verification-product-ssot.md#quick-verify-positioning) if Quick is in scope.
3. **Bootstrap or registry:** Either run `agentskeptic bootstrap` with **their** `BootstrapPackInput` v1 JSON and DB per [Step 4](first-run-integration.md#step-4-bootstrap-when-you-have-your-own-tool_calls-and-a-db-url), or supply committed **events.ndjson** + **tools.json** they own.
4. **Contract verify:** Run contract batch `verify` with **their** `--events`, `--registry`, and exactly one of `--db` / `--postgres-url`; capture **exit code** and **stdout** `WorkflowResult` JSON.
5. **Success criteria:** Exit code `0`, workflow `status` is `complete`, and each observed step is `verified` for the scope they care about—or a deliberate documented failure with remediation.
6. **Negative (not ProductionComplete):** Missing registry entries, wrong `--workflow-id`, unreadable DB URL, or stopping at demo / PatternComplete / IntegrateSpineComplete alone without Step 4 on **their** inputs.

**This repository cannot automate step 3–5 on integrator production systems** without their credentials and data; CI proves **PatternComplete** and **IntegrateSpineComplete** shapes only.

## Negative validation (what “not solved” means here)

- Treating **`layers.playwrightCommercialE2e: false`** in [`artifacts/commercial-validation-verdict.json`](../artifacts/commercial-validation-verdict.json) as evidence that **operator funnel conversion** is low — **invalid** reading.
- Claiming **`npm test` green** implies a specific customer reached **ProductionComplete** — **invalid** unless that customer’s Step 4 evidence exists outside this repo.
- Inferring **no verification ran** from **missing** `verify_outcome` telemetry alone — **invalid** without ruling out opt-out, transport failure, split deployment, or missing `funnel_anon_id` per [`growth-metrics-ssot.md`](growth-metrics-ssot.md) and [`funnel-observability-ssot.md`](funnel-observability-ssot.md).
