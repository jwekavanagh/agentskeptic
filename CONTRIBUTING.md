# Contributing

Thanks for helping improve **agentskeptic**.

## Before you start

- Read **[README.md](README.md)** for the product model and quickest demo (`npm start`).
- Normative behavior and CLI contracts live in **[docs/agentskeptic.md](docs/agentskeptic.md)**; product and correctness boundaries in **[docs/verification-product.md](docs/verification-product.md)** and **[docs/correctness-definition-normative.md](docs/correctness-definition-normative.md)**.

## Development setup

- **Node.js ≥ 22.13** (see `package.json` `engines`).
- `npm install`
- `npm run build` — TypeScript compile and asset copy.
- `npm test` — default validation before a PR (OSS `npm run build` + Vitest + SQLite `node:test`, then `scripts/commercial-enforce-test-harness.mjs` rebuilds **commercial** `dist/` and runs **`enforce`** integration tests plus **`assurance` CLI regression tests`, then `npm run build` restores OSS `dist/`, then `npm run validate-ttfv`). Policy: **[`docs/commercial-enforce-gate-normative.md`](docs/commercial-enforce-gate-normative.md)**.

### Postgres / website integration tests (`DATABASE_URL`, `TELEMETRY_DATABASE_URL`)

**Normative:** Copy [`website/.env.example`](website/.env.example) to **`website/.env`** and set valid **`DATABASE_URL`** and **`TELEMETRY_DATABASE_URL`** (local Postgres on the same port with separate DB names is fine—see the example). Run migrations as documented for the website package before expecting commercial or telemetry tests to pass.

**Do not treat skipped tests as OK:** Many website integration suites use **`describe.skipIf(!DATABASE_URL || !TELEMETRY_DATABASE_URL)`**. If those variables are unset, tests **skip**—that is a **configuration failure**, not a green run.

**Single command that loads `website/.env` and mirrors CI:** **`npm run validate-commercial`** (see [`scripts/validate-commercial-funnel.mjs`](scripts/validate-commercial-funnel.mjs)). Use this before a PR whenever you touch commercial, telemetry, funnel, or website DB-backed behavior.

**One instance per checkout:** Do not run two **`validate-commercial`** processes against the same clone at once—the script acquires **`artifacts/validate-commercial.lock`** (PID-based). Overlap previously caused Next.js “Another next build process is already running.” If you see **`validate_commercial_lock_busy`**, wait for the other run or remove a stale lock only after confirming no PID is still active.

**Avoid:** Running **`npx vitest`** from `website/` for those suites without having exported the URLs in your shell (Vitest does not load `website/.env` by itself the way `validate-commercial` does). There is **no** required repo-root `.env`; the project convention is **`website/.env`**.

## Pull requests

- **Public URLs, one-liner, and acquisition copy:** edit **[`config/marketing.json`](config/marketing.json)** only; run **`node scripts/validate-marketing.cjs`** (also executed by **`npm run check:primary-marketing`**). From **repo root** run **`npm run emit-primary-marketing`** (or **`npm run sync:public-product-anchors`**, the alias) and commit the derived artifacts: `schemas/openapi-commercial-v1.yaml`, root `package.json` fields, `llms.txt`, `src/publicDistribution.generated.ts`, and README marker regions. This matches [`docs/public-distribution.md`](docs/public-distribution.md). If you touch distribution surfaces, run **`npm run validate-commercial`** (requires Postgres **`DATABASE_URL`** and **`TELEMETRY_DATABASE_URL`** in `website/.env`) before opening a PR. If you change **`prepublishOnly`**, **`scripts/pack-smoke-commercial.mjs`**, or commercial codegen, also run **`npm run pack-smoke`** (or rely on **`validate-commercial`**, which includes it). Do not edit prose inside README sync markers by hand.
- Keep changes focused; match existing style and patterns in touched files.
- If you change user-visible CLI behavior, stdout/stderr, or schemas, update the relevant **docs** and **tests** (many behaviors are guarded by doc-contract and golden tests).
- Do not duplicate normative numbers or stream contracts in the README when they belong in `docs/quick-verify-normative.md` or `docs/agentskeptic.md`.

## Dependency security (merge gate vs policy)

**Machine-readable pins and checks** live in [`docs/dependency-security-pins.json`](docs/dependency-security-pins.json); the JSON shape is defined by [`docs/dependency-security-pins.schema.json`](docs/dependency-security-pins.schema.json). CI runs `scripts/assert-dependency-security-pins.mjs` and contract tests that read that manifest—do not describe alternate numeric floors in prose here; change the manifest and matching `package.json` / lockfiles in the same change.

**Merge-gated (proven in CI):** Under `website/src/`, the repository forbids any source text that matches an entry in the manifest’s **`drizzleMachineChecks`** list (each entry is a regular expression plus flags). That list is the **only** Drizzle-related static surface area this repo treats as automatically enforced in CI for this workstream.

**Policy-only (human review):** Any stricter Drizzle or SQL style rules that are **not** listed in **`drizzleMachineChecks`** are documentation and review policy only; they are **not** merge-gated by those checks until someone extends the manifest and tests accordingly.

### Marketing copy and marketing.json sync

- **Marketing SSOT:** edit **`config/marketing.json`** (**`node scripts/validate-marketing.cjs`**; **`npm run check:primary-marketing`** or **`check:discovery-acquisition`** runs discovery + marketing validation).
- **Site-only copy:** edit **`website/src/content/productCopy.ts`** for non-JSON UI strings (account, integrate shell, a11y, short labels). **Public commercial and pricing text** lives in **`website/src/lib/commercialNarrative.ts`** with numerics in **`config/commercial-plans.json`** (not duplicated in `productCopy`).
- **Site IA (nav, Learn hub, sitemap, redirect):** canonical rules live in **`docs/website-product-experience.md`** and must stay consistent with **`website/src/lib/siteChrome.ts`** and **`website/src/app/sitemap.ts`**. The **`/guides`** Learn hub is **indexable** and listed in the sitemap; **`GET /examples`** (hub path only) **308** redirects to **`/guides`**.
- **Sync:** after changing marketing JSON, run **`npm run emit-primary-marketing`** (or **`sync:public-product-anchors`**) from repo root and commit the regenerated artifacts listed in [`docs/public-distribution.md`](docs/public-distribution.md).
- **Gate:** before merging marketing changes, run **`npm run verify:web-marketing-copy`** so validation, visitor-outcome node tests, the website build, **`marketing-*.contract` tests**, and the full website Vitest suite (including **`docs-marketing-contract`**) all pass.

## Conventional Commits (merge gate)

Releases and changelogs are **fully automated** from [Conventional Commits](https://www.conventionalcommits.org/) on `main` via [`semantic-release`](https://github.com/semantic-release/semantic-release) (see the Release workflow below). To keep `main` releasable:

- **`feat:`** → a **minor** release; **`fix:`** or **`perf:`** → **patch**; **`BREAKING CHANGE:`** in the commit body, or a **`!`** after the type/scope (e.g. `feat(api)!: …`) → **major**.
- Other types (`chore:`, `docs:`, `ci:`, `refactor:`, `test:`, `build:`, …) do **not** trigger a new npm/PyPI version by themselves unless they include a breaking marker.
- **Local hook:** with `npm install`, [**Husky**](https://typicode.github.io/husky/) runs [**commitlint**](https://github.com/conventional-changelog/commitlint) on the commit message (`.husky/commit-msg` → `commitlint.config.cjs`). Skipping hooks with `--no-verify` is discouraged; CI will still run the same check on pull requests.
- **IDE-style messages:** short summaries without a `type:` prefix (for example from Cursor) are **allowed**. If a line looks like a Conventional Commit (`chore: …`, `feat(scope): …`, etc.), the full **[@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional)** rules apply; otherwise the hook does not block the commit. For **versioning and changelogs** on `main`, semantic-release still only recognizes conventional commit **types**—use a conventional first line for commits that should drive releases, or **squash-merge** the PR and set the squash title to a conventional message.
- **CI:** [`ci.yml`](.github/workflows/ci.yml) runs **commitlint** on pull requests (commit range from the base branch to the PR head), with the same rules as the local hook (see `commitlint.config.cjs`).

## GitHub Actions (operator)

This section is the **normative** single source of truth for CI and release workflows. Workflow YAML header comments are pointers only; behavioral rules must not live only in workflow comments.

### Default token permissions

- **[`ci.yml`](.github/workflows/ci.yml)** and **[`assurance-scheduled.yml`](.github/workflows/assurance-scheduled.yml)** declare workflow-level `permissions: contents: read` so the default `GITHUB_TOKEN` scope does not depend on repository or organization defaults.
- **[`release.yml`](.github/workflows/release.yml)** uses `permissions: contents: write`, `id-token: write`, and `issues: write` / `pull-requests: write` (for GitHub Releases). It does not use a long‑lived **npm** token: npm publish uses **Trusted Publishing (OIDC)** like the manual workflow. Do not add `NPM_TOKEN` or `NODE_AUTH_TOKEN` to replace OIDC.
- The **emergency** [**Commercial npm publish**](.github/workflows/commercial-publish.yml) workflow (manual dispatch) also uses `contents: read` and `id-token: write` for npm (OIDC). Prefer automated releases; use the emergency workflow only when the Release job cannot be fixed quickly.

### Automated release (single repo version: npm + PyPI + changelog)

- **When:** on every **push to `main`** that contains at least one **releasable** Conventional Commit since the last [`v*.*.*`](https://github.com/semver/semver) tag (see semantic-release’s rules), [**`release.yml`**](.github/workflows/release.yml) runs **semantic-release**.
- **What it does:** updates **[`CHANGELOG.md`](CHANGELOG.md)**, bumps the **one** shared semver in root **[`package.json`](package.json)** and [`python/pyproject.toml`](python/pyproject.toml), syncs the workspace and distribution artifacts via **`node scripts/sync-release-artifacts.mjs`** (including **`node scripts/emit-primary-marketing.cjs`** and lockfile refresh), **commits** those files, **tags** `vX.Y.Z`, creates a **GitHub Release**, and **`npm publish`** the **commercial** CLI (same as today: `prepublishOnly` → `scripts/build-commercial.mjs` with `COMMERCIAL_LICENSE_API_BASE_URL` set from your repository).
- **PyPI:** when semantic-release **pushes** the `vX.Y.Z` tag, a **second job** in the same workflow (triggered by the tag) builds the wheel from [`python/`](python/) and publishes to PyPI with **Trusted Publishing (OIDC)** via `pypa/gh-action-pypi-publish`. The **old** `py-v*` tag path was **removed**; PyPI is only published from a **`v*.*.*`** tag created by the Release workflow. Register this workflow as a **trusted publisher** for the `agentskeptic` project on [PyPI](https://pypi.org) (and remove or update any publisher entry that only referenced the previous tag-based job).

### One-time and ongoing repository settings

- **Variable (required for releases):** set [**`COMMERCIAL_LICENSE_API_BASE_URL`**](https://docs.github.com/en/actions/concepts/workflows-and-actions/variables) on the **repository** to your **production** app origin (no trailing slash), same value you used as the `commercial_license_api_base_url` input to the old manual commercial publish workflow. The Release job fails fast if it is empty when a real publish runs.
- **Optional secret:** if **branch protection** on `main` blocks the default **`GITHUB_TOKEN`** from pushing the release commit and tag, add a **fine-grained or classic PAT** with `contents: write` to the `main` branch as the repository secret **`SEMANTIC_RELEASE_GITHUB_TOKEN`**. The workflow uses `secrets.SEMANTIC_RELEASE_GITHUB_TOKEN || secrets.GITHUB_TOKEN` for `checkout` and for semantic-release. If pushes still fail, adjust your ruleset to allow the **`github-actions[bot]`** app to push to `main`, or use the PAT.
- **First-time git tags:** if no **`v*.*.*`** tag yet exists, semantic-release will infer from history; to align the next automated release with the current npm `latest` line, ensure a tag **`v<current version>`** exists on `main` (one-time) or accept that the first run may normalize the baseline.

### Dry-run and emergency paths

- **Dry-run:** run [**Actions → Release → Run workflow**](.github/workflows/release.yml) with **dry_run** set to the default (true) to run `semantic-release --dry-run` (no version bump, tag, or publish). This does not require `COMMERCIAL_LICENSE_API_BASE_URL`. Alternatively: `npm run release:dry` locally (needs a clean git state and the same `origin` you expect in CI).
- **Emergency npm only:** if automation is broken, use the documented [**Commercial npm publish**](.github/workflows/commercial-publish.yml) **workflow dispatch** and the same production URL as `COMMERCIAL_LICENSE_API_BASE_URL` would be. This path does not bump the repo, tag, or PyPI; you must follow up with a fix on `main` and align versions manually to avoid split brain.

**Post-release validation (recommended):** run [`assurance-scheduled`](.github/workflows/assurance-scheduled.yml) after a major release, and `npm view agentskeptic version` to confirm the registry.

### CI concurrency (normative)

| Trigger | Concurrency group | `cancel-in-progress` | Expected outcome |
|---------|-------------------|----------------------|------------------|
| `push` / `pull_request` to **`refs/heads/main`** | `ci-${{ github.workflow }}-${{ github.ref }}` | **false** | Two rapid `main` pushes may yield **two concurrent** workflow runs; both may run to completion; neither is canceled by a sibling `main` run. Branch protection treats the conclusion of the run(s) the protection rule evaluates as authoritative (standard GitHub behavior). |
| `push` / `pull_request` to **any other ref** | same group formula | **true** | A newer push on the **same ref** **cancels** the older in-progress run. The canceled run ends **`cancelled`**. Required checks re-target the **newest** run for that PR or branch; superseded runs must not be interpreted as the final gate. |

### Failure modes (summary)

| Failure | System behavior |
|---------|------------------|
| Trusted Publisher / OIDC misconfiguration | `npm publish` / PyPI publish fails; there is no long-lived token fallback. |
| Registry lag after publish | The emergency commercial workflow’s verify step retries; the Release workflow relies on normal registry behavior. |
| Concurrency cancel on a feature branch | Superseded run is `cancelled`; the latest run owns the gate. |
| Duplicate version on npm / PyPI | Re-publishing the same version fails; there is no double publish for the same tag. If the release commit and tag are pushed but a registry step fails, fix the cause and re-run the failed job, or follow manual recovery. |

**Required checks after merge (non-`main` concurrency):** From `main`, create a **throwaway branch**, push two trivial commits in quick succession on that branch, and confirm the older `CI` run is **`cancelled`** and the newer run **`success`**—proving cancel-in-progress for non-`main` without changing `main`’s concurrency semantics.

## Reporting issues

- Describe expected vs actual behavior, minimal reproduction, and Node version.
- For security-sensitive reports, use **[SECURITY.md](SECURITY.md)** instead of a public issue.
