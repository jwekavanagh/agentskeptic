# Contributing (GitHub)

Project-wide process (development setup, commercial validation, and marketing sync) is in the repository root **[`CONTRIBUTING.md`](../CONTRIBUTING.md)**.

**Quick link:** [Conventional Commits](https://www.conventionalcommits.org/) and automated releases are required reading—see the sections **Conventional Commits (merge gate)** and **GitHub Actions (operator)** in that file.

When opening a **pull request**, **commitlint** (local Husky hook + `ci.yml` job) allows either IDE-style one-line messages or [Conventional Commits](https://www.conventionalcommits.org/). For **semantic-release** on `main` to pick up **minor** / **major** bumps from your work, use conventional wording in the commit or PR merge title (e.g. when squash-merging), as described in root **`CONTRIBUTING.md` → Conventional Commits (merge gate)**.
