# Regression artifact (compare) — normative

This document is the **single source of truth** for cross-run **compare** in Agentskeptic: the **`RegressionArtifactV1`** object (JSON Schema [`schemas/regression-artifact-v1.schema.json`](../schemas/regression-artifact-v1.schema.json)), the compare-run **manifest** ([`schemas/compare-run-manifest-v1.schema.json`](../schemas/compare-run-manifest-v1.schema.json)), certificate profile dispatch, digest algorithm, and Debug **`POST /api/compare`** / CLI **`agentskeptic compare`** contracts.

**Embedded verification:** The artifact’s **`verification`** field is a full **`RunComparisonReport`** (v4). Pairwise math, `logicalStepKey`, `recurrenceSignature`, and related semantics are defined in [agentskeptic.md § Cross-run comparison](agentskeptic.md#cross-run-comparison-normative) (algorithms) and the **`run-comparison-report`** schema. This document does not duplicate that algorithmic section.

## Artifact top level

- **`schemaVersion`:** `1`
- **`artifactSource`:** `cli_manifest` (manifest-based compare) or `debug_corpus` (Debug UI only)
- **`manifestSha256`:** SHA-256 (64 lowercase hex) of the **manifest file bytes** for `cli_manifest`; for `debug_corpus` the fixed placeholder of **64** `0` digits ([`DEBUG_MANIFEST_SHA256_PLACEHOLDER`](../src/regressionArtifact.ts)).
- **`workflowId`:** Redundant copy from **`verification.workflowId`** for filters.
- **`certificateProfile`:** From the manifest, or the fixed **uniform `contract_sql`** object for `debug_corpus` (LCT / langgraph trust compare via manifest is CLI-only; see plan).
- **`verification`:** `RunComparisonReport` v4 from **`buildRunComparisonReport`**.
- **`outcomeCertificates`:** One row per run: dispatched **`OutcomeCertificateV1`**, run kind, **`certificateCanonicalDigest`**.
- **`tracePairwise`:** Output of **`buildTracePairwisePayload`** (pairwise `ExecutionTraceView` only).
- **`narrative`:** Classification, headline, `whyItMatters`, structural counts, trace summary.
- **`humanText`:** Machine-authored summary block (stderr for CLI success).
- **`narrativeHtml`:** Server-built HTML; Debug UI assigns this string to the compare panel **`innerHTML`**.

## CLI success and failure

- **Success (exit 0):** **stdout** one JSON object that validates as **`regression-artifact-v1`**. **stderr** exactly the **`humanText`** string (one block; a trailing newline is added if missing). Canonical wire bytes use sorted object keys via **`stringifyRegressionArtifact`**.
- **Failure (exit 3):** **stdout** empty. **stderr** one line JSON **`execution_truth_layer_error`** envelope; codes include **`COMPARE_*`** (see `cliOperationalCodes` / `failureCatalog`).

**Invocation:** `agentskeptic compare --manifest <path>` only. The manifest’s **`baseDirectory`** is resolved relative to the manifest file’s directory; each run’s **`workflowResult`** and **`events`** paths are resolved under that base.

## `certificateProfile` and builders

- **Uniform / perRun** forms per **`compare-run-manifest-v1`** schema. Allowed run kinds: **`contract_sql`**, **`contract_sql_langgraph_checkpoint_trust`** (not `quick_preview`).
- **Dispatch:** `contract_sql` → `buildOutcomeCertificateFromWorkflowResult(result, "contract_sql")`; LCT kind → `buildOutcomeCertificateLangGraphCheckpointTrustFromWorkflowResult(result)`.
- **Digest:** **`certificateCanonicalDigest`** = SHA-256 (hex) of UTF-8 **sorted-key JSON** of the certificate object (see [`certificateDigest.ts`](../src/certificateDigest.ts) and [`sortedJsonStringify.ts`](../src/sortedJsonStringify.ts)), matching standalone certificate invariants.

## Debug `POST /api/compare`

- **Request:** `{ "runIds": string[] }` (length ≥ 2), same workflow id across selected runs, all loaded ok.
- **Response (200):** JSON with **exactly one** key: **`regression`**, whose value is **`RegressionArtifactV1`** (AJV `regression-artifact-v1`). No other keys.
- The browser sets **`regression.narrativeHtml`** to the compare output region; do not recompute highlights in client JS.

## HTML hooks (`narrativeHtml`)

Root: **`section[data-etl-section="regression-artifact"]`**. Children include:

- **`h2[data-etl-regression-classification]`** — `narrative.classification`
- **`p[data-etl-regression-headline]`** — `narrative.headline`
- **`p[data-etl-why-matters]`** — `narrative.whyItMatters`

## Pairwise trace diff (summary)

**Input:** Two **`ExecutionTraceView`** values (prior = second-to-last run index, current = last) from **`buildExecutionTraceView`**.

**Per-`seq` rows:** `only_in_prior` | `only_in_current` | `in_both` from the evaluated tool-observed summary per `seq` (see [`executionTraceDiff.ts`](../src/executionTraceDiff.ts)). **`seqTimelineOrderDiverged`** compares the ordered `seq` list by first-evaluated ingest index. **Non-tool** event counts are keyed by `wireType` for all nodes where `wireType !== "tool_observed"` (including `tool_skipped`).

## Error codes (non-exhaustive)

Manifest read/schema, path resolution, events load, regression artifact build/certificate/validation: see **`COMPARE_MANIFEST_*`**, **`COMPARE_RESOLVE_PATH_FAILED`**, **`COMPARE_EVENTS_LOAD_FAILED`**, **`COMPARE_REGRESSION_ARTIFACT_INVALID`**, **`COMPARE_CERTIFICATE_BUILD_FAILED`**, and existing compare input codes in operational disposition tables.

## Assurance manifests

**`--manifest`** in spawned **`argv`** is treated as a path argument (resolved relative to the assurance manifest directory). Include it when using **`compare --manifest`**.

---

**Integrators** should treat this file plus [`outcome-certificate-normative.md`](outcome-certificate-normative.md) (when working with embedded certificates) as the compare + certificate surface. **`agentskeptic.md`** links here for the regression artifact; algorithmic compare details remain under **Cross-run comparison** in that file.
