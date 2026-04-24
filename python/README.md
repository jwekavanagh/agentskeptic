# agentskeptic (Python)

First-party Python verification kernel and `agentskeptic.verify()` integration surface.

Authoritative integrator narrative: [../docs/integrator-verification.md](../docs/integrator-verification.md).

```bash
pip install -e ".[dev]"
pytest
```

Parity vectors live under `tests/parity_vectors/`; regenerate with Node (after `npm run build`):

```bash
node ../scripts/emit-python-parity-goldens.mjs
```

Cold-path smoke (from **repository root**; copies partner fixtures + `schemas/` into the image):

```bash
docker build -f python/Dockerfile -t agentskeptic-py-verify .
```

PyPI releases: the repository version is the single source of truth; the GitHub **Release** workflow (`.github/workflows/release.yml`) creates a `v*.*.*` tag and then publishes the wheel with Trusted Publishing (see root `CONTRIBUTING.md`).
