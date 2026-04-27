# Commercial enforce gate (normative)

Normative ownership moved to [`docs/ci-enforcement.md`](ci-enforcement.md).

## Current gate (authoritative summary)

- `verify` is stateless and local.
- `enforce` is stateful and paid.
- Lock-file parity (`--expect-lock` / `--output-lock`) is no longer the enforcement model.
- OSS cannot provide authoritative over-time enforcement state.

## Validation index

Paths below remain machine-checked by `test/docs-commercial-enforce-gate-normative.test.mjs`.

<!-- commercial-enforce-gate-validation-index:start -->

- `website/__tests__/reserve-route.entitlement.integration.test.ts`
- `scripts/validate-commercial-funnel.mjs`
- `scripts/commercial-enforce-test-harness.mjs`
- `test/enforce-oss-forbidden.test.mjs`
- `src/cli/lockOrchestration.ts`
- `test/commercial-license-reserve-intent.test.mjs`
- `src/cli/lockOrchestration.test.ts`
- `test/assurance-cli.test.mjs`

<!-- commercial-enforce-gate-validation-index:end -->
