# execution-truth-layer

MVP **Execution Truth Layer**: verify agent workflow steps against **SQLite** or **Postgres** ground truth using an append-only **NDJSON** event log and a **`tools.json`** registry.

**Authoritative specification:** **[docs/execution-truth-layer.md](docs/execution-truth-layer.md)**.

**CI workflow truth contract** (Postgres CLI, machine-readable **`verify-workflow`** I/O): **[CI workflow truth contract (Postgres CLI)](docs/execution-truth-layer.md#ci-workflow-truth-contract-postgres-cli)**.

## Requirements

- **Node.js ≥ 22.13** (uses built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html))
- **Runtime dependency [`pg`](https://node-postgres.com/)** when using Postgres verification paths

## Primary path: try it in one command

```bash
npm install
npm start
```

**`npm start`** runs the same onboarding as **`npm run first-run`**: it builds, seeds **`examples/demo.db`** from **`examples/seed.sql`**, then verifies **`wf_complete`** (database matches the log → **complete** / **verified**) and **`wf_missing`** (the log references a contact id that **does not exist** in the DB → **inconsistent** / **missing** / **ROW_ABSENT**). You get plain-language framing, **human verification reports** printed to **stdout**, and **workflow result JSON** for each run—no need to author events or registry entries first.

**Why SQLite first:** file-backed SQLite needs no Docker or hosted database, so you can judge the idea immediately. **Postgres** and **`npm run test:ci`** are for full CI parity (same reconciliation rules; see SSOT).

**Permissions (demo):** creating **`examples/demo.db`** uses read/write access to that file path only; verification queries use read-only SQLite access as described in the SSOT.

## Local validation (no Postgres)

```bash
npm test
```

Runs **`npm run build`**, **`npm run test:vitest`**, SQLite-only **`npm run test:node:sqlite`**, and **`scripts/first-run.mjs`**. No **`POSTGRES_*`** variables required.

## Full CI suite (Postgres)

```bash
docker run -d --name etl-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
export POSTGRES_ADMIN_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres
export POSTGRES_VERIFICATION_URL=postgresql://verifier_ro:verifier@127.0.0.1:5432/postgres
npm run test:ci
```

(On Windows PowerShell, use `$env:POSTGRES_ADMIN_URL="..."`.) Matches [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Automation and CLI (short)

For **`verify-workflow`**, a **human-readable verification report** is written to **stderr** and the machine-readable **workflow result JSON** to **stdout** on verdict exits **0–2**; operational failures use exit **3** with a **single-line JSON error** on stderr (see [CLI operational errors](docs/execution-truth-layer.md#cli-operational-errors)). Full format and stream order: **[Human truth report](docs/execution-truth-layer.md#human-truth-report)**. Use **`--no-truth-report`** when you want empty stderr on verdict paths for logs/parsers. Exit codes: **0** complete, **1** inconsistent, **2** incomplete, **3** operational.

After **`npm start`**, replay via CLI:

```bash
node dist/cli.js --workflow-id wf_complete --events examples/events.ndjson --registry examples/tools.json --db examples/demo.db
```

Postgres (exactly one of **`--db`** or **`--postgres-url`**):

```bash
node dist/cli.js --workflow-id wf_complete --events examples/events.ndjson --registry examples/tools.json --postgres-url "postgresql://user:pass@host:5432/dbname"
```

**Cross-run comparison:** `node dist/cli.js compare --prior earlier.json --current latest.json` — see [Cross-run comparison (normative)](docs/execution-truth-layer.md#cross-run-comparison-normative).

**Validate registry (no database):** `node dist/cli.js validate-registry --registry examples/tools.json` — see [Registry validation (`validate-registry`) — normative](docs/execution-truth-layer.md#registry-validation-validate-registry--normative). Copy-paste templates: **`examples/templates/`**.

**In-process hook (SQLite):** **`npm run example:workflow-hook`** — one **`await withWorkflowVerification`** at the workflow root; see [Low-friction integration (in-process)](docs/execution-truth-layer.md#low-friction-integration-in-process).

## Advanced topics (normative detail only in SSOT)

Schema versions (**`schemaVersion` `6`** on emitted results, engine shape **`5`**), **`workflowTruthReport`**, **`verificationPolicy`**, **`eventSequenceIntegrity`**, **`failureDiagnostic`**, **`verify-workflow compare`** inputs, **strong** vs **eventual** consistency, Postgres session guards, and the **`test:workflow-truth-contract`** / **`ci-workflow-truth-postgres-contract.test.mjs`** CI contract are specified in **[docs/execution-truth-layer.md](docs/execution-truth-layer.md)**—not duplicated here.

## License

Released under the **MIT License** — see **[LICENSE](LICENSE)**.
