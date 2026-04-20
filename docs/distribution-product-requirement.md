# Distribution product requirements

Normative **consumer pipeline** requirements for public distribution proof and traceability. Implementation details, script phases, and the Clause ID ↔ evidence matrix live in [`public-distribution-ssot.md`](public-distribution-ssot.md) (traceability table between `<!-- distribution-traceability-table:start -->` and `<!-- distribution-traceability-table:end -->`).

Each `### REQ-DIST-*` heading below is the **requirement prose SSOT** for one row of that table. **Clause heading set** must stay in lockstep with the SSOT table (enforced by `test/distribution-requirement-clauses.test.mjs` and `test/distribution-ssot-clause-coverage.test.mjs`).

---

### REQ-DIST-001

The **consumer** repository exists, uses **`main`** as the default branch, and has **GitHub Actions** enabled with permissions suitable for the distribution consumer workflow (see SSOT traceability row **REQ-DIST-001**).

---

### REQ-DIST-002

The published **`foreign-smoke.yml`** workflow bytes in the consumer repository **match** the verified fixture after upload (no drift after `PUT` / `GET`; see SSOT **REQ-DIST-002**).

---

### REQ-DIST-003

The **`foreign-smoke.yml`** workflow is **indexed** and visible to GitHub Actions after publish, with bounded retry semantics for `gh workflow view` and a follow-up permissions read as specified in SSOT **REQ-DIST-003**.

---

### REQ-DIST-004

Proof of a green consumer run must be obtainable **without** `gh run view` inputs: resolve the run via the list API using **`run-name`**, fetch the artifact **`distribution-proof`**, read **`proof.json`**, and assert the JSON field **`foreign_smoke_fixture_sha256`** (see SSOT **REQ-DIST-004**).

---

### REQ-DIST-005

The merge gate runs the **distribution consumer** job **after** core validation jobs (e.g. **`needs: [test, commercial]`** on canonical `main`), dispatches and proves the consumer workflow per SSOT, and uses the same stable identifiers **`run-name`**, **`distribution-proof`**, **`proof.json`**, and **`foreign_smoke_fixture_sha256`** in proof steps (see SSOT **REQ-DIST-005**).

---

### REQ-DIST-006

Documentation links form a coherent SSOT: this requirement doc, [`public-distribution-ssot.md`](public-distribution-ssot.md), and the repo pointer in [`agentskeptic.md`](agentskeptic.md) stay aligned (see SSOT **REQ-DIST-006**).
