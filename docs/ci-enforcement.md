# CI enforcement (`enforce`)

This document is the CI enforcement SSOT.

## Product boundary

- `verify` is local and stateless (single-run correctness).
- `enforce` is stateful and paid (correctness over time).
- Portable lock artifacts are not the authority for CI enforcement.

If your team needs baseline management, drift detection, and explicit change acceptance across runs, use `agentskeptic enforce` with a paid account.

## Prerequisites

- Commercial build of the CLI.
- Valid `AGENTSKEPTIC_API_KEY`.
- Successful reserve preflight (`POST /api/v1/usage/reserve` with `intent=enforce`).
- Active paid entitlement.

## Stateful workflow

1. **Create baseline**
   - `agentskeptic enforce --workflow-id ... --events ... --registry ... --db ... --create-baseline`
2. **Check drift in CI**
   - `agentskeptic enforce --workflow-id ... --events ... --registry ... --db ...`
3. **Accept intended change**
   - `agentskeptic enforce --workflow-id ... --events ... --registry ... --db ... --accept-drift`

## Exit behavior

- `0`: pass (or baseline/accept completed with complete result)
- `1|2`: underlying verification status inconsistent/incomplete
- `3`: operational failure
- `4`: drift detected in stateful check

## Notes

- `--expect-lock` and `--output-lock` are removed from enforcement semantics.
- OSS `verify` remains usable, but it does not provide authoritative cross-run enforcement state.
