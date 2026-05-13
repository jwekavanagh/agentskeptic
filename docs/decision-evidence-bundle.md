# Decision evidence bundle (operational SSOT)

Normative definitions of **ProductionComplete**, artifacts **A1–A5**, and adoption checks remain in [`adoption-epistemics.md`](adoption-epistemics.md). This document defines how **operational retention** maps to portable JSON files for reviewers and CI.

## Evidence maturity (three steps)

Use the lightest mode that fits the job; add retained files only when you need governance, customer review, or audit handoff.

| Step | What you run | What you keep |
|------|----------------|----------------|
| **1 — Default truth check** | `agentskeptic check` (or SDK equivalent) with no bundle flags | **stdout:** Outcome Certificate JSON. **stderr:** human report and `truth_check_verdict:` line. Nothing is written to disk unless you redirect. |
| **2 — Decision evidence on disk** | Add **`--write-decision-bundle <dir>`** (alias **`--proof <dir>`**) | **Decision evidence bundle** directory: certificate, `exit.json`, `human-layer.json`, `manifest.json`, optional A4/A5 (see [Directory layout](#directory-layout)). |
| **3 — Full local proof (technical + decision)** | Add **`--write-run-bundle <other-dir>`** alongside `--write-decision-bundle` | **Technical run bundle** in the run directory (events, `workflow-result.json`, `agent-run.json`, optional signing) **and** the decision bundle in the decision directory. The CLI writes both when both flags are set (see [Technical run bundle](#terminology)). |

**Authoritative full audit package (on-disk files):** The complete set of decision-grade files (`outcome-certificate.json`, `exit.json`, `human-layer.json`, manifest, optional `attestation.json` / `next-action.json`) plus the optional **technical run bundle** is produced **only** from the **CLI** (step 2 or 3). Hosted commercial APIs do **not** emit that directory layout.

## Terminology

| Name | Purpose |
|------|---------|
| **Technical run bundle** | `--write-run-bundle`: `events.ndjson`, `workflow-result.json`, `agent-run.json` (optional signing). For reproduction and engine debugging. |
| **Decision evidence bundle** | `--write-decision-bundle`: outcome certificate, exit record, human-layer, manifest, optional attestation / next-action. For audit and decision retention without shell redirection. |

## Directory layout

Written only when **`--write-decision-bundle <dir>`** is passed (opt-in).

| File | Role |
|------|------|
| `outcome-certificate.json` | A1 — [`OutcomeCertificateV3`](../schemas/outcome-certificate-v3.schema.json). Canonical sorted JSON, **no** trailing newline (so `sha256(file_bytes)` matches `certificateCanonicalDigestHex`). |
| `material-truth.json` | **Required (v2 manifest).** Canonical material-truth projection of the certificate; same byte rule as the certificate (sorted JSON, no trailing newline) so `sha256(file_bytes)` matches `materialTruthSha256`. |
| `exit.json` | A2 — exit code mapped from the certificate; `cliConvention` **`outcome_certificate_v2`** ([`decision-evidence-exit-v1`](../schemas/decision-evidence-exit-v1.schema.json)) |
| `human-layer.json` | A3 — human report text or `suppressed` when `--no-human-report` |
| `attestation.json` | Optional A4 — [`decision-evidence-attestation-v1`](../schemas/decision-evidence-attestation-v1.schema.json) via `--decision-attestation` |
| `next-action.json` | Optional A5 — [`decision-evidence-next-action-v1`](../schemas/decision-evidence-next-action-v1.schema.json) via `--decision-next-action` |
| `manifest.json` | Bundle metadata ([`decision-evidence-bundle-manifest-v2`](../schemas/decision-evidence-bundle-manifest-v2.schema.json)) — embeds `certificate.sha256` and `materialTruth.sha256`. Canonical sorted JSON **plus** a trailing newline. |
| `manifest.sig.json` | **Optional.** Ed25519 signature over `manifest.json` bytes ([`workflow-result-signature`](../schemas/workflow-result-signature.schema.json) shape). Emitted only when `--sign-ed25519-private-key <path>` is paired with `--write-decision-bundle`. |

### Compatibility (non-wire)

- **`outcome-certificate.json`** in this bundle is **always** **[`schemas/outcome-certificate-v3.schema.json`](../schemas/outcome-certificate-v3.schema.json)** — top-level **`schemaVersion: 3`**, **`failureSpine`**, **`evidenceCompleteness`**.
- **`exit.json`** validates against **`schemas/decision-evidence-exit-v1.schema.json`**, which **frozen** declares **`cliConvention: "outcome_certificate_v2"`**. That **`cliConvention` string labels the **`decision-evidence-exit-v1`** envelope only; it is **not** the Outcome Certificate’s top-level **`schemaVersion`**. The certificate remains v3. Naming map: **[`outcome-certificate-normative.md#trust-artifact-naming-glossary`](outcome-certificate-normative.md#trust-artifact-naming-glossary)**.

## Completeness rules

- **`stateRelation`** on the outcome certificate is authoritative (see [`outcome-certificate-normative.md`](outcome-certificate-normative.md)).
- **`a5Required`** is **true** iff `stateRelation` is `does_not_match` or `not_established`; then **`next-action.json`** is required for **`manifest.completeness.status === "complete"`**. Otherwise the bundle may be **partial**.
- **A4** does not gate mechanical **`complete`**; **`a4Present`** is explicit for reviewers. Adoption-level ProductionComplete may still require human attestation per [`adoption-epistemics.md`](adoption-epistemics.md).

## CLI

Batch verify, **verify-integrator-owned**, and **quick** share the same optional flags:

- `--write-decision-bundle <dir>` (or `--proof <dir>`)
- `--write-run-bundle <dir>` (second directory for technical run bundle; use with step 3 above)
- `--decision-attestation <path>`
- `--decision-next-action <path>`

### Validation

```bash
agentskeptic decision-bundle validate <dir> [--public-key <path>]
```

- **Stdout (Tier 2):** exactly **one** sorted-keys JSON line (`kind: decision_bundle_validation`, `schemaVersion: 1`). Includes an `integrity` object — see below.
- **Stderr (Tier 1 only):** CLI error envelope when the bundle directory cannot be opened.
- **Exit code law (deterministic):**
  - `0` &nbsp; `status: "valid"` **and** `completeness.status: "complete"`
  - `1` &nbsp; `status: "valid"` **and** `completeness.status: "partial"`
  - `2` &nbsp; `status: "invalid"` (fingerprint mismatch, signature invalid, missing public key when `manifest.sig.json` exists, `material-truth.json` missing/tampered, manifest envelope failure → single `MANIFEST_SCHEMA` error, …)
  - `3` &nbsp; operational failure: the directory cannot be opened (Tier 1). No stdout JSON line.

#### `integrity` object (always present)

| Field | Meaning |
|-------|---------|
| `manifestVersion` | `1` (legacy reader-only) or `2`. |
| `certificateFingerprintOk` | `true` / `false` for v2; `null` for v1 manifests. |
| `materialTruthFingerprintOk` | `true` / `false` / `null` (null when `material-truth.json` is absent). |
| `materialTruthPresent` | Whether `material-truth.json` exists on disk. |
| `signature` | `absent` \| `valid` \| `invalid`. |
| `signaturePublicKeySpkiPem` | The verified PEM when `signature === "valid"`; otherwise `null`. The PEM embedded in a sidecar that fails verification is **not** echoed. |
| `selfVerifying` | `true` **iff** `manifestVersion === 2`, `status === "valid"`, no integrity errors, and `signature` is `absent` or `valid`. Legacy v1 manifests are never self-verifying by definition. |

**Recipient rule:** buyer / audit handoff requires `integrity.selfVerifying === true`.

#### Verifying a received bundle

```bash
# 1) Untrusted bundle on disk:
agentskeptic decision-bundle validate ./received-bundle \
    --public-key ./signer-spki.pem \
    | jq '.integrity.selfVerifying, .status, .completeness.status'

# 2) Strict-handoff guard:
agentskeptic decision-bundle validate ./received-bundle --public-key ./signer-spki.pem \
  | jq -e '.integrity.selfVerifying == true and .completeness.status == "complete"' > /dev/null
```

Exit 0 from the second command means the bundle is signed, the certificate and material-truth fingerprints recompute, completeness is `complete`, and the signature verifies under the supplied SPKI PEM.

## Hosted governance export (**GovernanceAuditBundleV3**)

`GET /api/v1/governance/export` returns JSON **`GovernanceAuditBundleV3`** (**breaking:** **`schemaVersion: 3` only**) with governance timeline rows plus **`evidenceSlices`** — one slice per **`governance_evidence`** row keyed by immutable evidence id (**not** CLI technical bundle semantics). Each slice includes **`outcomeCertificate`**, **`fingerprints`** (must match **`agentskeptic/governanceEvidence`** recomputation), **`hostedExit`** (strict **`decision-evidence-exit-v1`**, **`cliConvention: outcome_certificate_v2`** retained for compatibility with the standalone exit schema label), **`decisionCompleteness`**, and **`truthCheckVerdict`**.

| Aspect | Hosted export (**GovernanceAuditBundleV3**) | CLI decision bundle |
|--------|----------------|----------------------|
| On-disk layout (`outcome-certificate.json`, `exit.json`, …) | **Not produced** | **Yes** when `--write-decision-bundle` is set |
| Certificate + exit linkage | Stored per evidence row (`evidenceSlices[id]`) | Files on disk |
| A4 / A5 files | **Not** embedded as standalone artifacts | Optional files per table above (`attestation.json`, `next-action.json`) |
| Technical run NDJSON (**`--write-run-bundle`**) | **Hosted never emits** — CLI-only forensic depth | **Yes** alongside decision bundle when both flags |

For ingestion invariants (**Outcome Certificate v3** only, fingerprints SSOT) and export corruption semantics (**500 CORRUPTED_EVIDENCE_ROW**), see [`governance.md`](governance.md) and **`schemas/outcome-certificate-v3.schema.json`**.

## Audit handoff (packaging recipe)

There is no separate “archive” subcommand. For external review, package the directories your CI or local run produced.

**Example (two directories after step 3):** `proof/decision/` (decision bundle) and `proof/run/` (technical run bundle):

```bash
# Unix-like: single archive for handoff
zip -r agentskeptic-proof.zip proof/decision proof/run
# or
tar -cvzf agentskeptic-proof.tar.gz proof/decision proof/run
```

```powershell
# Windows PowerShell: zip both folders
Compress-Archive -Path proof\decision, proof\run -DestinationPath agentskeptic-proof.zip
```

Validate the decision folder when policy requires mechanical completeness:

```bash
agentskeptic decision-bundle validate proof/decision
```

Retain **stdout/stderr** from the same job if your process expects the Outcome Certificate line-exact on stdout.
