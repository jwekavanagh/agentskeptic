---
name: Adoption golden path
overview: Self-contained adoption plan — golden-path pointers, NO_STEPS message enrichment, demo + pinned npm test chain (six segments), verdict JSON, 31-row registry TSV, pinned test:node:sqlite (29 files) and test:ci.
todos:
  - id: types-load-counts
    content: EventFileAggregateCounts + loadEvents + Vitest
    status: completed
  - id: no-steps-module
    content: noStepsMessage + pipeline + registryValidation
    status: completed
  - id: demo-verdict
    content: demo + record + verify + verdict.json + package.json + delete first-run
    status: completed
  - id: node-tests
    content: adoption-validation + registry + readme + docs-boundary + golden-path-pointer tests
    status: completed
  - id: docs
    content: golden-path pointers + workflow-verifier adoption anchor + spec + README + product-ssot + first-run-log
    status: completed
  - id: test-updates
    content: Step-22 Vitest + Node + regen-truth-goldens closed list
    status: completed
isProject: true
---

# Adoption plan (single pinned design)

**Single authority:** This document is **self-contained** and is the **only** specification required for review, sign-off, and implementation. It is **not** a summary of another plan; there is no external checklist whose steps must be read to execute or validate this work.

## Analysis

### Engineering requirements

| Requirement | Satisfied by |
|-------------|--------------|
| SQL verification semantics unchanged | No reconciler or read-only session behavior changes. |
| Machine JSON stable | `WorkflowResult` schemaVersion **15** and `workflowTruthReport` schemaVersion **9** unchanged. **No** new keys on `WorkflowResult` or `workflowTruthReport` root objects. |
| Zero-match diagnosis | **Only** mutation: existing `Reason.message` on elements where `Reason.code === "NO_STEPS_FOR_WORKFLOW"` (set by enricher from `formatNoStepsForWorkflowMessage`). **No** removed exports: any symbol that tests or `regen-truth-goldens.mjs` imports today stays exported; adjust imports at call sites only, never delete the symbol. **No** schema file edits. **No** new keys on `WorkflowResult` / truth-report root. **No** new human-report line *types* in specs; **no** edits to [`src/reconciliationPresentation.ts`](src/reconciliationPresentation.ts) or human-grammar normative sections for this feature—enrichment runs *before* `formatWorkflowTruthReport` so the canonical substring appears via existing run-level rendering. **Every** test that currently asserts a fixed `NO_STEPS_FOR_WORKFLOW` `message` string is rewritten in step 22 to assert `formatNoStepsForWorkflowMessage(wfId, loadEventsForWorkflow(eventsPath, wfId).eventFileAggregateCounts)` (same `wfId` and `eventsPath` variables the test already uses). |
| Onboarding uses real batch CLI | `npm start` → `npm run build` → `node scripts/demo.mjs`. Demo runs two `spawnSync` of `dist/cli.js` with `stdio: 'inherit'` and **without** `--no-truth-report`. |

### Deliverables

The **Registry lines** fence at the end of this document is the **complete** adoption artifact registry (**31** rows, `relpath<TAB>op`). It lists **every** path touched by **Implementation** steps **1–22**, including all step-22 test and script edits; nothing in those steps is omitted from the registry. Step 13’s `adoption_validation_spec_registry_matches_plan` compares `docs/adoption-validation-spec.md` to this fence **byte-for-byte** (same rows, same order, same TABs).

### Forbidden

- File [`scripts/first-run.mjs`](scripts/first-run.mjs) and npm script key `first-run`.
- Substrings `workflow-verifier quick`, `npm run first-run`, substring `enforce`, and any fenced markdown (U+0060 U+0060 U+0060) in [`docs/golden-path.md`](docs/golden-path.md).
- Substrings `workflow-verifier quick` and `npm run first-run` in [`docs/verification-product-ssot.md`](docs/verification-product-ssot.md).
- Substring `--registry` in [`README.md`](README.md).
- In [`scripts/demo.mjs`](scripts/demo.mjs): **Forbidden substrings** (each must appear **0** times): `console.log`, `console.info`, `console.warn`, `console.debug`, `process.stdout.write`, `process.stderr.write`. **Required:** the literal substring `console.error(` appears **exactly once** in the file (failure-path logging only).

---

## Design

### NO_STEPS contract (one design, two mandatory tests)

**Schema change:** **None** for `schemas/workflow-result.schema.json` and `schemas/workflow-truth-report.schema.json`.

**Machine output:** JSON path `WorkflowResult.runLevelReasons` → find element `e` where `e.code === "NO_STEPS_FOR_WORKFLOW"` → field **`e.message`** (existing string field) equals **`formatNoStepsForWorkflowMessage(workflowId, eventFileAggregateCounts)`** with **no** trimming or transformation.

**Human stderr:** The string returned by `formatWorkflowTruthReport` **must** contain **`formatNoStepsForWorkflowMessage(...)`** as a **contiguous substring** once. Implementation achieves this **only** by setting `runLevelReasons[].message` before truth report build; **no** edits to `reconciliationPresentation.ts` human grammar and **no** new line prefix in the human report specification.

**Diagnostic text (canonical):** The substring is **exactly** the return value of:

```js
`No tool_observed events for workflowId ${JSON.stringify(workflowId)} after filtering. event_file_non_empty_lines=${String(c.eventFileNonEmptyLines)} schema_valid_events=${String(c.schemaValidEvents)} tool_observed_for_workflow=${String(c.toolObservedForRequestedWorkflowId)} tool_observed_other_workflows=${String(c.toolObservedForOtherWorkflowIds)}.`
```

**Stable assertion targets (only these two; no alternate surfaces):**

| Id | Surface | Mechanism | Assertion |
|----|---------|-----------|-----------|
| NO_STEPS_STDOUT | Machine JSON on stdout | Single NDJSON line: `const o = JSON.parse(line)` | `o.runLevelReasons.find(r => r.code === 'NO_STEPS_FOR_WORKFLOW').message === expectedMsg` |
| NO_STEPS_STDERR | Human truth report on stderr | Full stderr string `s` | `s.split(expectedMsg).length === 2` (exactly one contiguous occurrence) |

**Test A:** `no_steps_message_matches_template_for_wrong_workflow_id_fixture` — `expectedMsg = formatNoStepsForWorkflowMessage('wf_requested', loadEventsForWorkflow(fixturePath,'wf_requested').eventFileAggregateCounts)`; CLI args pinned in same test file as other adoption CLI tests (same `dist/cli.js` pattern as `cli_wf_*`).

**Test B:** `no_steps_human_stderr_contains_full_message` — same `expectedMsg` as Test A; same invocation shape as Test A except stderr captured; assertion is the table row for NO_STEPS_STDERR.

### Demo wrapper and batch parity

**Scope (pinned):** Identity of stdout/stderr **byte streams** with a manual double invocation of `node dist/cli.js …` applies to **each `spawnSync` inside `demo.mjs` only**. It does **not** apply to the full `npm start` transcript, because `npm run build` may print compiler output before `demo.mjs` runs.

**Source rule:** On **exit code 0** paths, [`scripts/demo.mjs`](scripts/demo.mjs) must not call any API in **Forbidden** (no extra success-path console I/O). Executable success-path work is **only**: filesystem and DB setup, two `spawnSync` of `dist/cli.js` with `{ stdio: 'inherit' }`, then `process.exit(0)`. **Pinned:** Between process start and `process.exit(0)`, no JavaScript in `demo.mjs` writes to fd 1 or fd 2 except what the Node runtime does for the **single** allowed `console.error(` (failure path only); on success path, **zero** such writes.

**OS rule:** With `stdio: 'inherit'`, each child inherits the parent’s stdout/stderr; with the source rule above, during each child’s lifetime the bytes on those fds match what the same argv would produce if the shell ran `node dist/cli.js …` directly in the same cwd and env.

**Proof:** Test `demo_script_has_no_success_path_console_io` reads [`scripts/demo.mjs`](scripts/demo.mjs) as UTF-8 and **asserts all of:** (1) for each **Forbidden** substring listed for `demo.mjs`, the source contains **zero** occurrences (`includes` false or split-length check yielding count 0); (2) the substring `console.error(` occurs **exactly once** (e.g. `src.split('console.error(').length === 2`). No other constraints are implied by this test beyond those two rules.

### Counters

Type `EventFileAggregateCounts` with fields `eventFileNonEmptyLines`, `schemaValidEvents`, `toolObservedForRequestedWorkflowId`, `toolObservedForOtherWorkflowIds`. In [`src/loadEvents.ts`](src/loadEvents.ts): `eventFileNonEmptyLines` = count of file lines with `trim().length > 0`; `schemaValidEvents` = count of lines where `JSON.parse` succeeds and `validateEvent` is true; `toolObservedForRequestedWorkflowId` = count of schema-valid `tool_observed` events whose `workflowId` equals the loader argument; `toolObservedForOtherWorkflowIds` = count of schema-valid `tool_observed` events whose `workflowId` differs.

### Enrichment

Function `enrichNoStepsRunLevelReasons(workflowId, reasons, c)` overwrites `message` on each reason with `code === "NO_STEPS_FOR_WORKFLOW"`. Calls: after `aggregateWorkflow` in [`verifyWorkflow`](src/pipeline.ts) before `formatWorkflowTruthReport`; after `loadEventsForWorkflow` on the NO_STEPS path in [`registryValidation.ts`](src/registryValidation.ts).

### Binary solved record (artifact specification)

**Path (repository-relative):** `artifacts/adoption-validation-verdict.json`

**Encoding:** UTF-8

**Exact JSON object shape** (pretty-printed with 2-space indent, single trailing newline after closing `}`):

- `schemaVersion`: number `1`
- `status`: string `solved`
- `provenBy`: string `npm_test_chain_exit_0`
- `commit`: string, exactly 40 lowercase hex characters from `git rev-parse HEAD`
- `recordedAt`: string matching ISO 8601 `YYYY-MM-DDTHH:mm:ss.sssZ`

**Writer:** [`scripts/record-adoption-verdict.mjs`](scripts/record-adoption-verdict.mjs) — synchronous write of the object above.

**Verifier:** [`scripts/verify-adoption-verdict.mjs`](scripts/verify-adoption-verdict.mjs) — reads path, parses JSON, validates all fields; compares `commit` to `execSync('git rev-parse HEAD',{encoding:'utf8'}).trim()`; exit **0** if valid, **1** otherwise.

**Pinned `scripts.test` value (exact `&&` chain, six segments, nothing else):**

`npm run build && npm run test:vitest && npm run test:node:sqlite && node scripts/demo.mjs && node scripts/record-adoption-verdict.mjs && node scripts/verify-adoption-verdict.mjs`

**Segment meanings:** (1) compile and sync artifacts; (2) Vitest; (3) `test:node:sqlite` runs **exactly** the command in **Pinned `scripts.test:node:sqlite` and `scripts.test:ci`** (**29** `test/*.mjs` arguments, UTF-16 code unit order); (4) onboarding demo (`demo.mjs` replaces `first-run.mjs`); (5) write verdict JSON; (6) verify verdict. **Solved** requires all six exit 0 in order; `node scripts/verify-adoption-verdict.mjs` is the **last** process in the chain (no commands after it).

### Pinned `scripts.test:node:sqlite` and `scripts.test:ci`

**`scripts.test:node:sqlite` — exact value (single line, no line breaks):**

`node --test --test-force-exit test/adoption-docs-boundary.test.mjs test/adoption-validation-registry.test.mjs test/adoption-validation.test.mjs test/assurance-cli.test.mjs test/bundle-signature-cli-write.test.mjs test/bundle-signature-codes-doc.test.mjs test/bundle-signature-fixture.test.mjs test/cli.test.mjs test/docs-contract.test.mjs test/docs-enforce-stream-contract.test.mjs test/docs-golden-path-pointer-only.test.mjs test/docs-quick-enforce-link.test.mjs test/docs-readme-no-registry-flag.test.mjs test/docs-relational-ssot.test.mjs test/docs-remediation-doctrine.test.mjs test/docs-workflow-result-normative-prose.test.mjs test/enforce-cli.test.mjs test/npm-scripts-contract.test.mjs test/pipeline.sqlite.test.mjs test/quick-verify.sqlite.test.mjs test/quickVerifyPostbuildGate.test.mjs test/reconciler.sqlite.test.mjs test/removed-script-names-ban.test.mjs test/stable-failure-consistency.test.mjs test/tools-registry-relational-surface.test.mjs test/withWorkflowVerification.test.mjs test/workflow-result-consumer-contract.test.mjs test/workflow-result-stdout-version.test.mjs test/workflowTruthReport.test.mjs`

**`scripts.test:ci` — exact value (single line):** the three commands removed from `scripts.test` (`node examples/minimal-ci-enforcement/run.mjs`, `node dist/cli.js assurance run --manifest examples/assurance/manifest.json`, `npm run validate-ttfv`) **must** live **only** in `scripts.test:ci`, in the positions shown here (immediately after `npm run test:node:sqlite`, before `npm run test:postgres`):

`npm run build && npm run test:vitest && npm run test:node:sqlite && node examples/minimal-ci-enforcement/run.mjs && node dist/cli.js assurance run --manifest examples/assurance/manifest.json && npm run test:postgres && npx playwright install chromium && npm run test:debug-ui && npm run validate-ttfv`

**Migration rule:** **Only** `scripts.test:ci` may contain the three post-sqlite segments removed from `scripts.test`; implement **step 10** so `test:ci` matches the pinned line above character-for-character (the pinned `test:node:sqlite` value flows into both `npm test` and `npm run test:ci` via `npm run test:node:sqlite`).

**Meaning of solved:** The branch tip is **solved** when `npm test` exits **0**; then `record-adoption-verdict.mjs` has written `artifacts/adoption-validation-verdict.json` and `verify-adoption-verdict.mjs` confirmed `commit === git rev-parse HEAD`.

**Meaning of not-solved:** When `npm test` exits non-zero, **no** committed artifact update is required: the failure is the signal. The repo may still contain a previous run’s `artifacts/adoption-validation-verdict.json` from an older commit until a green run overwrites it—CI red does not mandate a special “failed” JSON shape.

**Keeping the artifact current:** The PR must include `artifacts/adoption-validation-verdict.json` produced by the author’s last successful `npm test` on the tip so `commit` equals `git rev-parse HEAD` at that tip (re-run `npm test` after rebase before merge).

---

## Implementation

Execute steps **1 through 22** in order.

1. `LoadEventsResult` + `eventFileAggregateCounts` + all call sites. **Done when:** `npm run build` succeeds.

2. Fixture file [`test/fixtures/adoption-validation/wrong-workflow-id.events.ndjson`](test/fixtures/adoption-validation/wrong-workflow-id.events.ndjson) — exact three lines:

```
x
{"schemaVersion":1,"workflowId":"wf_other","seq":0,"type":"tool_observed","toolId":"t.other","params":{}}
{"schemaVersion":1,"workflowId":"wf_other","seq":1,"type":"tool_observed","toolId":"t.other","params":{}}

```

3. [`src/loadEvents.ts`](src/loadEvents.ts) counters + [`src/loadEvents.eventFileAggregateCounts.test.ts`](src/loadEvents.eventFileAggregateCounts.test.ts) asserting the four numbers for the fixture and `wf_requested`. **Done when:** Vitest passes.

4. [`src/noStepsMessage.ts`](src/noStepsMessage.ts) + [`src/noStepsMessage.test.ts`](src/noStepsMessage.test.ts) with exact golden string for `wf_requested` and step-3 counts. **Done when:** Vitest passes.

5. Enricher in [`verifyWorkflow`](src/pipeline.ts). **Done when:** `tsc` ok.

6. Enricher in [`registryValidation.ts`](src/registryValidation.ts). **Done when:** `tsc` ok.

7. [`scripts/demo.mjs`](scripts/demo.mjs) per **Design**. **Done when:** `npm start` exits `0`.

8. Delete [`scripts/first-run.mjs`](scripts/first-run.mjs). **Done when:** path absent.

9. [`scripts/record-adoption-verdict.mjs`](scripts/record-adoption-verdict.mjs) and [`scripts/verify-adoption-verdict.mjs`](scripts/verify-adoption-verdict.mjs) per **Design**. **Done when:** both exit `0` when run after a full green test.

10. [`package.json`](package.json): Set `scripts.start` to `npm run build && node scripts/demo.mjs` (no `first-run`). Remove script key `first-run`. Set `scripts.test` to the **exact** six-segment `&&` chain in **Binary solved record**. Set `scripts.test:node:sqlite` to the **exact** single-line value in **Pinned `scripts.test:node:sqlite` and `scripts.test:ci`** (**29** arguments, no additions or omissions). Set `scripts.test:ci` to the **exact** single-line value in that same subsection. **Migration (single target):** The segments removed from `scripts.test`—`node examples/minimal-ci-enforcement/run.mjs`, `node dist/cli.js assurance run --manifest examples/assurance/manifest.json`, and `npm run validate-ttfv`—must appear **only** as the three `&&`-chained parts immediately after `npm run test:node:sqlite` inside **`scripts.test:ci`** (as in the pinned `test:ci` line). They **must not** appear in `scripts.test`. (The standalone key `scripts.validate-ttfv` remains allowed.) **Done when:** `npm test` exits `0`.

11. [`test/adoption-validation.test.mjs`](test/adoption-validation.test.mjs): five tests named exactly `demo_script_has_no_success_path_console_io`, `cli_wf_complete_batch_contract`, `cli_wf_missing_batch_contract`, `no_steps_message_matches_template_for_wrong_workflow_id_fixture`, `no_steps_human_stderr_contains_full_message`. For `demo_script_has_no_success_path_console_io`, implement **Proof** under **Demo wrapper and batch parity** (forbidden substrings each **0** times; `console.error(` exactly **once**). DB prep: delete `examples/demo.db` if present, `DatabaseSync`, read [`examples/seed.sql`](examples/seed.sql), `exec`, `close`. **Done when:** passes after build.

12. [`test/docs-readme-no-registry-flag.test.mjs`](test/docs-readme-no-registry-flag.test.mjs): Assert [`README.md`](README.md) contains substring `--registry` **zero** times; count of ``` delimiter lines equals **2** (exactly one opening and one closing fence for a single block). **Done when:** passes.

13. [`test/adoption-validation-registry.test.mjs`](test/adoption-validation-registry.test.mjs) — `adoption_validation_spec_registry_matches_plan`, **31** TSV lines (exact byte match to **Registry lines**). **Done when:** passes.

14. [`test/adoption-docs-boundary.test.mjs`](test/adoption-docs-boundary.test.mjs): `golden-path.md` and `verification-product-ssot.md` must not contain `workflow-verifier quick` or `npm run first-run`; `golden-path.md` must not contain lowercase substring `enforce`. [`docs/first-run-validation-log.md`](docs/first-run-validation-log.md) must be **byte-exact** UTF-8 to step 20. **Done when:** passes.

15. [`test/docs-golden-path-pointer-only.test.mjs`](test/docs-golden-path-pointer-only.test.mjs): `readFileSync('docs/golden-path.md','utf8')` must **not** match `/```/` (no fenced code blocks). **Done when:** passes.

16. [`docs/golden-path.md`](docs/golden-path.md): Markdown only. Structure:

    - One `#` title line: `# Adoption pointers`
    - `## Engineer` — unordered list; each item is **one** markdown link. Minimum links: to `README.md`, and to [`docs/workflow-verifier.md#examples`](docs/workflow-verifier.md#examples) (fragment **`#examples`** — heading `## Examples` in that file).
    - `## Integrator` — **one** list item: link to `docs/workflow-verifier.md#adoption-integrator-command`.
    - `## Operator` — **one** list item: link to `docs/workflow-verifier.md#postgres-verification-batch-and-cli`.
    - `## Validation` — **one** list item: link to `docs/adoption-validation-spec.md`.

    **No** text outside headings and list items. Substring `enforce` must not appear in the file (CI adoption lives under workflow-verifier only). **Done when:** steps 14–15 pass.

17. [`docs/workflow-verifier.md`](docs/workflow-verifier.md): Add heading and HTML anchor `adoption-integrator-command` with **exactly one** fenced `bash` block whose two non-empty lines are `npm run build` and `workflow-verifier --workflow-id <id> --events <path> --registry <path> --db <sqlitePath>`. Document `LoadEventsResult.eventFileAggregateCounts` (four field names and meanings from **Counters**). Document NO_STEPS using the **Diagnostic text (canonical)** template from **Design**. Replace every `first-run.mjs` and `npm run first-run` with `scripts/demo.mjs` and `npm start`. **Done when:** doc-contract Vitest passes.

18. [`README.md`](README.md): Value proposition, Node version, one fenced block containing **only** `npm install` and `npm start`. **No** `--registry`. **No** numbered adoption steps. **Mandatory** links to `docs/golden-path.md` and `docs/workflow-verifier.md`. **Done when:** step 12 passes.

19. [`docs/verification-product-ssot.md`](docs/verification-product-ssot.md): Under `## For engineers (first run)`, delete entire existing body. Insert **only** this line: `All adoption entry points: [docs/golden-path.md](golden-path.md).` **Done when:** step 14 passes.

20. [`docs/first-run-validation-log.md`](docs/first-run-validation-log.md): Replace entire file with UTF-8 (LF, no BOM) whose exact byte sequence is: `# First-run validation log (retired)`, newline, newline, `This log is retired. Use [golden-path.md](golden-path.md) and [adoption-validation-spec.md](adoption-validation-spec.md).`, newline — and nothing else. **Done when:** step 14 passes.

21. [`docs/adoption-validation-spec.md`](docs/adoption-validation-spec.md): Validation table matching **Validation** section of this plan; `ADOPTION_ARTIFACT_PROOF` TSV byte-identical to **Registry lines**; **exactly one** paragraph (no second paragraph) that contains all of these verbatim substrings: `artifacts/adoption-validation-verdict.json`, `npm test`, `node scripts/demo.mjs`, and `node scripts/record-adoption-verdict.mjs && node scripts/verify-adoption-verdict.mjs`. **Done when:** step 13 passes.

22. **Test and script updates:**

    - [`src/registryValidation.test.ts`](src/registryValidation.test.ts): `import { formatNoStepsForWorkflowMessage } from './noStepsMessage.js'`; `import { loadEventsForWorkflow } from './loadEvents.js'`; in `NO_STEPS_FOR_WORKFLOW when no events for workflow id`, `const { eventFileAggregateCounts } = loadEventsForWorkflow(join(root,'examples','events.ndjson'),'wf_nonexistent___')`; `const expected = formatNoStepsForWorkflowMessage('wf_nonexistent___', eventFileAggregateCounts)`; `expect(r.resolutionIssues[0].message).toBe(expected)`.
    - [`src/workflowTruthReport.semantics.test.ts`](src/workflowTruthReport.semantics.test.ts): In `run-level issue: runLevelIssues mirror reasons with categories`, set `runLevelReasons[0].message` to exactly `No tool_observed events for workflowId "w" after filtering. event_file_non_empty_lines=0 schema_valid_events=0 tool_observed_for_workflow=0 tool_observed_other_workflows=0.` (synthetic engine `workflowId` is `w` and counts are all zero).
    - [`test/npm-scripts-contract.test.mjs`](test/npm-scripts-contract.test.mjs): `pkg.scripts.test` is **exactly** the six-segment string in **Binary solved record**; `pkg.scripts['test:node:sqlite']` is **exactly** the sqlite line in **Pinned `scripts.test:node:sqlite` and `scripts.test:ci`**; `pkg.scripts['test:ci']` is **exactly** the `test:ci` line in that subsection. None of these may contain `first-run`.
    - [`test/pipeline.sqlite.test.mjs`](test/pipeline.sqlite.test.mjs): For every assertion where `runLevelReasons[j].code === 'NO_STEPS_FOR_WORKFLOW'`, set expected `message` to `formatNoStepsForWorkflowMessage(wfId, loadEventsForWorkflow(eventsPath, wfId).eventFileAggregateCounts)` using that test’s `wfId` and `eventsPath` variables.
    - [`test/cli.test.mjs`](test/cli.test.mjs): Same rule as pipeline for the zero-step test.
    - [`scripts/regen-truth-goldens.mjs`](scripts/regen-truth-goldens.mjs): Add constants `NO_STEPS_MSG_WF_COMPLETE` and `NO_STEPS_MSG_NO_SUCH` whose values are the two strings in **Diagnostic text (canonical)** with `workflowId` replaced by `wf_complete` and `no_such_workflow` respectively and all four counts `0`. Remove every other literal occurrence of those two full strings from the file; references use the constants only.

    **Done when:** `npm test` exits `0`.

---

## Testing

- **`npm test` chain (only valid order):** `npm run build` → `npm run test:vitest` → `npm run test:node:sqlite` (command **exactly** the pinned **29**-file line under **Pinned `scripts.test:node:sqlite` and `scripts.test:ci`**, covering steps 11–15) → `node scripts/demo.mjs` → `node scripts/record-adoption-verdict.mjs` → `node scripts/verify-adoption-verdict.mjs`. Same `scripts.test` string as **Binary solved record** / step 10.
- **Gate:** `npm test` exit code `0` (all six segments succeed in sequence).
- **NO_STEPS contract:** Assertions use **only** the two rows in **Stable assertion targets** (stdout `runLevelReasons[].message` and stderr full-string substring). No test may treat optional JSON fields or alternate human lines as the primary diagnostic for this adoption work.

---

## Documentation ownership

| Artifact | Sole location of instructional content |
|----------|----------------------------------------|
| Copy-paste batch command with `--registry` | [`docs/workflow-verifier.md`](docs/workflow-verifier.md) section `#adoption-integrator-command` |
| Pointer list to adoption / validation / operator topics | [`docs/golden-path.md`](docs/golden-path.md) — links only, **no** fences (test in step 15) |
| `eventFileAggregateCounts`, NO_STEPS message template | [`docs/workflow-verifier.md`](docs/workflow-verifier.md) |
| Product trust + authority matrix (non-step prose) | [`docs/verification-product-ssot.md`](docs/verification-product-ssot.md) — **For engineers** body is **only** the single line in step 19 |
| Registry TSV, requirement table, verdict semantics | [`docs/adoption-validation-spec.md`](docs/adoption-validation-spec.md) |
| Repo entry, `npm install`, `npm start`, links | [`README.md`](README.md) — **no** `--registry`, **no** multi-step tutorial, **exactly one** fenced code block (the install/start block from step 18 only) |

---

## Validation

| Id | Proof |
|----|--------|
| WRAPPER_IO | `demo_script_has_no_success_path_console_io` — asserts **Demo** **Proof** (zero forbidden substrings; exactly one `console.error(`) |
| BATCH_COMPLETE | `cli_wf_complete_batch_contract` |
| BATCH_MISSING | `cli_wf_missing_batch_contract` |
| NO_STEPS_STDOUT | `no_steps_message_matches_template_for_wrong_workflow_id_fixture` |
| NO_STEPS_STDERR | `no_steps_human_stderr_contains_full_message` |
| README_SCOPE | `docs-readme-no-registry-flag.test.mjs` |
| DOC_BOUNDARY | `adoption-docs-boundary.test.mjs` |
| GOLDEN_PATH_POINTERS | `docs-golden-path-pointer-only.test.mjs` |
| ARTIFACT_REGISTRY | `adoption_validation_spec_registry_matches_plan` |
| VERDICT | `npm test` runs the six-segment chain in **Binary solved record**; after segments 1–4 succeed, `node scripts/record-adoption-verdict.mjs` writes `artifacts/adoption-validation-verdict.json` with keys `schemaVersion` (number 1), `status` (`"solved"`), `provenBy` (`"npm_test_chain_exit_0"`), `commit` (40-char lowercase hex from `git rev-parse HEAD`), `recordedAt` (ISO 8601 `YYYY-MM-DDTHH:mm:ss.sssZ`); pretty-printed 2-space indent; one trailing newline. Segment 6 `node scripts/verify-adoption-verdict.mjs` reads that path, validates types and `commit === execSync('git rev-parse HEAD').trim()`, exits 0 or 1 |
| REGISTRY_NO_STEPS | `src/registryValidation.test.ts` |

**Solved / not solved:** **Solved** = `npm test` exit 0, verdict file written and verified per **Binary solved record**. **Not-solved** = non-zero `npm test`; no required failure verdict artifact.

---

## Registry lines (copy into docs/adoption-validation-spec.md)

**31** data rows (each `relpath<TAB>op`, no header row), sorted by **UTF-16 code unit order** on `relpath` (same order as JavaScript `a < b` on strings); **31** newline-terminated lines inside the fence below; TAB (U+0009) is the only separator between columns; the closing ``` is on the line immediately after row 31.

```
README.md	modify
artifacts/adoption-validation-verdict.json	add
docs/adoption-validation-spec.md	add
docs/first-run-validation-log.md	modify
docs/golden-path.md	add
docs/verification-product-ssot.md	modify
docs/workflow-verifier.md	modify
package.json	modify
scripts/demo.mjs	add
scripts/first-run.mjs	delete
scripts/record-adoption-verdict.mjs	add
scripts/regen-truth-goldens.mjs	modify
scripts/verify-adoption-verdict.mjs	add
src/loadEvents.eventFileAggregateCounts.test.ts	add
src/loadEvents.ts	modify
src/noStepsMessage.test.ts	add
src/noStepsMessage.ts	add
src/pipeline.ts	modify
src/registryValidation.test.ts	modify
src/registryValidation.ts	modify
src/types.ts	modify
src/workflowTruthReport.semantics.test.ts	modify
test/adoption-docs-boundary.test.mjs	add
test/adoption-validation-registry.test.mjs	add
test/adoption-validation.test.mjs	add
test/cli.test.mjs	modify
test/docs-golden-path-pointer-only.test.mjs	add
test/docs-readme-no-registry-flag.test.mjs	add
test/fixtures/adoption-validation/wrong-workflow-id.events.ndjson	add
test/npm-scripts-contract.test.mjs	modify
test/pipeline.sqlite.test.mjs	modify
```
