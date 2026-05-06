# Activation telemetry review (Phase 9)

**Status:** audit / RFC. **Scope:** measure whether users reach a trusted first truth check via `agentskeptic check`. **Non-goals:** new tracking, schema changes, hosted `/api/verify`, MCP, dashboards, or anything that affects verification semantics.

**Normative SSOTs (do not duplicate here):**

- HTTP contract, attribution, schema versions, opt-in / opt-out: [`funnel-observability.md`](funnel-observability.md)
- Operator KPI SQL: [`growth-metrics.md`](growth-metrics.md)
- Storage split (core vs telemetry Postgres): [`telemetry-storage.md`](telemetry-storage.md)

This document is a thin audit pointer that maps the existing telemetry to the first-run activation funnel, lists known gaps, and gives operators safe pseudocode for the four conversion questions Phase 9 cares about.

## Activation funnel

```text
Docs discovery → first local agentskeptic check → verdict produced → optional hosted report → optional CI wrapper → later enforce
```

Key product question: *Are users reaching a trusted first truth check?*

## Where events are emitted (CLI)

The single transport is [`src/telemetry/postProductActivationEvent.ts`](../src/telemetry/postProductActivationEvent.ts). It is best-effort, never throws, and only POSTs when [`isProductActivationTelemetryEnabled()`](../src/telemetry/telemetryConsent.ts) returns `true`.

| Phase | Call site | Subcommand wire value |
|------|-----------|------------------------|
| Quick verify (`verify_started` / `verify_outcome`) | [`src/cli.ts`](../src/cli.ts) (quick path) | `quick_verify` |
| Default first-run path `agentskeptic check` and bare verify | [`src/verify/batchVerifyTelemetrySubcommand.ts`](../src/verify/batchVerifyTelemetrySubcommand.ts) | `batch_verify` (or `verify_integrator_owned` for integrator-owned crossing) |
| Lock-managed verify and `enforce` (commercial) | [`src/cli/lockOrchestration.ts`](../src/cli/lockOrchestration.ts) | `batch_verify` or `quick_verify` |

Server ingest: [`website/src/app/api/funnel/product-activation/route.ts`](../website/src/app/api/funnel/product-activation/route.ts). Wire HTTP semantics, body validation, and ±300s skew rules live in [`funnel-observability.md`](funnel-observability.md#post-apifunnelproduct-activation-http-semantics).

## Wire schema v3 — exactly what is sent

These are the only fields the CLI builds in `postProductActivationEvent`:

- `event`: `verify_started` | `verify_outcome`
- `schema_version`: `3`
- `run_id`, `issued_at`
- `workload_class`: `bundled_examples` | `non_bundled`
- `workflow_lineage`: `catalog_shipped` | `integrate_spine` | `integrator_scoped` | `unknown`
- `subcommand`: `batch_verify` | `quick_verify` | `verify_integrator_owned`
- `build_profile`: `oss` | `commercial`
- `telemetry_source`: `local_dev` | `unknown`
- `install_id`
- optional `funnel_anon_id` (only when set via [`funnel-anon`](funnel-observability.md#funnel-attribution-normative))
- optional `verification_hypothesis` (only when valid charset and length per [`src/telemetry/verificationHypothesisContract.ts`](../src/telemetry/verificationHypothesisContract.ts))
- `verify_outcome` only: `terminal_status`: `complete` | `inconsistent` | `incomplete`

## Privacy boundary

**Sent (only the fields above).** Pseudonymous join keys (`install_id`, optional `funnel_anon_id`), bounded enums, ISO timestamps, and operator-supplied `verification_hypothesis` text bounded by the contract module.

**Never sent by `postProductActivationEvent`.** Event NDJSON, registry contents, database contents, SQL with user data, HTTP witness responses, the Outcome Certificate body, the human report body, file paths, environment variables, API keys, secrets, or stack traces. The transport builds the body from a fixed allowlist; nothing reads files or stderr to populate it.

**How to disable telemetry.** `AGENTSKEPTIC_TELEMETRY=0` forces it off; persisted `{"telemetry": false}` in `~/.agentskeptic/config.json` does the same. Default OSS behavior with the env unset and no persisted opt-in is also off. Implemented in [`src/telemetry/telemetryConsent.ts`](../src/telemetry/telemetryConsent.ts) and gated at the very top of [`postProductActivationEvent`](../src/telemetry/postProductActivationEvent.ts).

**How telemetry never affects verification.** The transport wraps the only `fetch` in `try { … } catch { /* ignore */ }`, swallows on a 400ms timeout via [`src/telemetry/fetchWithTimeout.ts`](../src/telemetry/fetchWithTimeout.ts), and returns `void`. Callers do not branch on its result. Verification stdout, stderr, and exit codes are produced by the verification engine independently.

## Activation-question coverage matrix

| # | Question | Status | How |
|---|----------|--------|-----|
| 1 | Did a user reach the first-run docs? | not from CLI | Lives on the website surface beacon (`POST /api/funnel/surface-impression`), not in product-activation events. Joinable later via `funnel_anon_id`. |
| 2 | Did a user run `agentskeptic check`? | partial | Yes via `verify_started`, but the `subcommand` wire value is `batch_verify` and does not distinguish `check` from a bare `agentskeptic` invocation. Use `event = 'verify_started'` as the start-of-CLI proxy. |
| 3 | First / local / default vs `enforce`? | gap | Lock-managed `enforce` reuses the same `subcommand`. `build_profile = 'commercial'` narrows the candidate population but is **not** proof of an active subscription or of `enforce` specifically. Operators cannot cleanly separate first-time `check` from `enforce` in v3. |
| 4 | Did the run produce a verdict? | yes | `verify_outcome` only fires when the executor returns a terminal `WorkflowResult` / quick rollup. Lack of a row is ambiguous (see [`funnel-observability.md`](funnel-observability.md#cli-lock-telemetry-sequencing)). |
| 5 | Was the verdict trusted / not_trusted / unknown? | mapped | Wire vocabulary is `terminal_status` ∈ `complete | inconsistent | incomplete`. Operator mapping for the activation funnel: `complete → trusted`, `inconsistent → not_trusted`, `incomplete → unknown`. The user-facing `truth_check_verdict` line on stderr is the product-truth source (see [`first-truth-check.md`](first-truth-check.md)); do not conflate the two vocabularies in product copy. |
| 6 | Did the user attempt a shareable report? | no | `--share-report-origin` posts via [`src/shareReport/postPublicVerificationReport.ts`](../src/shareReport/postPublicVerificationReport.ts) and does **not** emit a dedicated activation event. See *Known gaps* below. |
| 7 | Did the user later use the GitHub Action or `enforce`? | gap | The composite action [`.github/actions/agentskeptic-check/action.yml`](../.github/actions/agentskeptic-check/action.yml) is a thin wrapper around the CLI; the surface (CLI vs github_action vs cursor) is not on the wire. `enforce` is not separately discriminated. See *Known gaps*. |
| 8 | Can users disable telemetry? | yes | `AGENTSKEPTIC_TELEMETRY=0` or persisted `{"telemetry": false}`. Default-off when unset and no persisted opt-in. |
| 9 | Does telemetry never affect verification? | yes | Best-effort `fetch` wrapped in `try/catch`; no exit-code coupling; covered by tests in [`src/telemetry/postProductActivationEvent.test.ts`](../src/telemetry/postProductActivationEvent.test.ts) and [`test/post-product-activation-install-id.test.mjs`](../test/post-product-activation-install-id.test.mjs). |
| 10 | Are secrets, store contents, payloads, certificate bodies, registry contents excluded? | yes | The body is built from a fixed allowlist; no reads from files, registry, certificate, stderr, or env-vars beyond the bounded `verification_hypothesis` and the documented join keys. Re-asserted by the Phase 9 safety test in [`test/product-activation-telemetry.test.mjs`](../test/product-activation-telemetry.test.mjs). |

## Suggested operator query shapes

**Source of truth for SQL:** [`growth-metrics.md`](growth-metrics.md). The pseudocode below is illustrative; do not run it directly. All telemetry-tier queries target `TELEMETRY_DATABASE_URL`; see [`telemetry-storage.md`](telemetry-storage.md).

**Distinct installs that ran a CLI verification (proxy for `check`):** the existing metric `ActiveInstalls_DistinctInstallId_VerifyStarted_Rolling7dUtc` in [`growth-metrics.md`](growth-metrics.md) — distinct `install_id` on `verify_started` rows where `metadata->>'telemetry_source' IS DISTINCT FROM 'local_dev'`.

**Verdict mix (activation vocabulary):** the existing metric `Counts_QualifiedVerifyOutcomesByTerminalStatus_Rolling7dUtc` — counts `terminal_status` ∈ `complete | inconsistent | incomplete` (plus `malformed_other`).

**Conversion: CLI verification → hosted shareable report.** Not directly answerable from product-activation rows today (no share event). Documented gap below.

```text
-- Pseudocode only; not enforced by tests. Today this query has no LHS event.
-- Numerator would require a future activation event such as event = 'share_report_attempt'
-- correlated by run_id with the verify_outcome row.
SELECT
  COUNT(DISTINCT vo.metadata->>'run_id') FILTER (
    WHERE EXISTS (
      SELECT 1 FROM funnel_event sr
      WHERE sr.event = 'share_report_attempt' /* not implemented */
        AND sr.metadata->>'run_id' = vo.metadata->>'run_id'
    )
  ) AS share_attempts,
  COUNT(DISTINCT vo.metadata->>'run_id') AS verify_outcomes
FROM funnel_event vo
WHERE vo.event = 'verify_outcome'
  AND vo.metadata->>'telemetry_source' IS DISTINCT FROM 'local_dev'
  AND vo.created_at >= now() AT TIME ZONE 'UTC' - interval '7 days';
```

**Conversion: first `check` → later `enforce`.** Not directly answerable from product-activation rows today; the `subcommand` wire value does not separate `enforce`. The closest available cohort is `build_profile = 'commercial'` on `verify_started`, which narrows the population but does not prove `enforce`. The licensed completion event `licensed_verify_outcome` (`POST /api/v1/funnel/verify-outcome`) gives a stricter monetization-side signal but lives on a different beacon (see [`funnel-observability.md`](funnel-observability.md)). Documented gap below.

```text
-- Pseudocode only; not enforced by tests.
-- Today there is no enforce-specific subcommand; build_profile narrows but does not prove enforce.
WITH first_check AS (
  SELECT install_id, MIN(created_at) AS first_at
  FROM funnel_event
  WHERE event = 'verify_started'
    AND install_id IS NOT NULL
    AND metadata->>'telemetry_source' IS DISTINCT FROM 'local_dev'
  GROUP BY install_id
),
later_commercial AS (
  SELECT DISTINCT install_id
  FROM funnel_event
  WHERE event = 'verify_started'
    AND install_id IS NOT NULL
    AND metadata->>'build_profile' = 'commercial'
)
SELECT
  COUNT(*)                                AS first_check_installs,
  COUNT(*) FILTER (
    WHERE install_id IN (SELECT install_id FROM later_commercial)
  )                                       AS later_commercial_installs
FROM first_check;
```

## Known gaps and intentionally deferred work

The current schema is intentionally narrow. Phase 9 does **not** add wire fields. The following are open product questions for a future, deliberately-scoped phase that includes both CLI and the website Zod accept side:

- **No surface discriminator.** GitHub Action vs Cursor rule vs interactive CLI all post the same activation body. A future `surface` field gated on `AGENTSKEPTIC_SURFACE` (set in the composite action env) would address question 7. Not added in Phase 9 — the CLI does not currently read it.
- **No `enforce` discriminator.** Lock-managed `enforce` reuses `subcommand: batch_verify | quick_verify`. A future `command` or `mode` field would address question 3. Not added in Phase 9.
- **No share-report event.** [`postPublicVerificationReport`](../src/shareReport/postPublicVerificationReport.ts) does not emit a separate activation beacon. A future `share_report_attempt` activation event correlated by `run_id` would address question 6.
- **First-run docs viewing.** Lives in website analytics (`acquisition_landed` / `integrate_landed`) and joins on `funnel_anon_id`, not in product-activation telemetry. Question 1 stays answered only after the integrator runs `agentskeptic funnel-anon set`.
- **`check` vs bare verify.** Both serialize to `subcommand: batch_verify`. If we ever need to separate them, we can either repurpose `subcommand` (breaking change) or add an orthogonal `command` field. Not addressed in Phase 9.

## How this fits Phase 9 acceptance

Phase 9 lands docs and a narrow node-test safety guard around the activation contract above; it makes no schema, transport, or verification changes. The privacy contract (best-effort, opt-in, swallowed failures, no payload contents) is preserved.

- Code changes: none.
- Doc changes: this file plus a small cross-link from [`first-truth-check.md`](first-truth-check.md).
- Test additions: [`test/product-activation-telemetry.test.mjs`](../test/product-activation-telemetry.test.mjs) re-asserts disable, allowlist, swallowed failure, and `terminal_status` enum from the `dist/` build used by the SQLite gate.
