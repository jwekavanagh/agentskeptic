# Outcome Certificate v1 — normative (public contract)

This document is the **sole product authority** for the **Outcome Certificate**: trust boundary, field semantics, and the **`highStakesReliance` derivation table**. Engine internals (`WorkflowResult`, reconciler codes, NDJSON) remain in [`agentskeptic.md`](agentskeptic.md).

## Trust boundary (unchanged intent)

- The certificate proves **observed SQL state vs expectations** derived from structured tool activity and the registry (contract) or inferred mapping (quick preview)—**not** that a tool executed, and **not** generic observability.
- Verification is a **snapshot** at read time.

## Top-level fields (v1)

| Field | Meaning |
|-------|---------|
| `schemaVersion` | Wire version; must be `1` for this document. |
| `workflowId` | Workflow under verification. |
| `runKind` | `contract_sql` (registry-backed) or `quick_preview` (inferred). |
| `stateRelation` | `matches_expectations` \| `does_not_match` \| `not_established` — SQL vs expectations only. |
| `highStakesReliance` | `permitted` \| `prohibited` — may this artifact gate ship / bill / compliance decisions. |
| `relianceRationale` | One mandatory human string explaining `highStakesReliance`. |
| `intentSummary` | Stakeholder-safe summary of intended verification scope. |
| `explanation` | `{ headline, details[] }` with stable `code` + `message` pairs (forensics). |
| `steps` | Per-step plain language: declared action, expected outcome, observed outcome. |
| `humanReport` | Byte-stable human rendering; must equal `formatOutcomeCertificateHuman(certificate)` in the implementation. |

## `highStakesReliance` derivation (normative)

Materialized `highStakesReliance` **must** equal `derive(runKind, stateRelation)`:

| runKind | stateRelation | highStakesReliance |
|---------|---------------|-------------------|
| `quick_preview` | any | `prohibited` |
| `contract_sql` | `matches_expectations` | `permitted` |
| `contract_sql` | `does_not_match` | `prohibited` |
| `contract_sql` | `not_established` | `prohibited` |

## Mapping from engine `WorkflowResult` (contract)

- `stateRelation`: `complete` → `matches_expectations`; `inconsistent` → `does_not_match`; `incomplete` → `not_established`.
- `humanReport`: structural human report text from the finalized truth report (`formatWorkflowTruthReportStruct`).
- **No commercial fields** on the certificate (billing gates execution **before** emission).

## JSON Schema

[`schemas/outcome-certificate-v1.schema.json`](../schemas/outcome-certificate-v1.schema.json)

## Share envelope v2

[`schemas/public-verification-report-v2.schema.json`](../schemas/public-verification-report-v2.schema.json) — POST body `{ "schemaVersion": 2, "certificate": <OutcomeCertificateV1> }`. Legacy v1 rows may still be served by GET `/r/{id}` (frozen renderer); new writes use v2 only.
