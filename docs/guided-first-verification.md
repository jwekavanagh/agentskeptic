# Guided first verification (integrator SSOT)

This is the **default** path to reach a real verification: **valid `tools.json` (draft) + matching quick-ingest bytes + one local `agentskeptic quick` command**—without stitching separate tools or multiple docs.

## Prerequisite

- Hosted same-origin **registry draft** is enabled: `POST /api/integrator/registry-draft` (see [registry-draft.md](registry-draft.md) for operators and response **v2** with `quickIngestInput`).

## Steps (browser)

1. Open **[/integrate/guided](https://agentskeptic.com/integrate/guided)** (from [Get started](/integrate) use **Guided: generate registry and quick input**).
2. Choose **OpenAI tool calls** or **Bootstrap pack** and edit the JSON if needed, then **Generate draft + quick input**.
3. Copy the **tools array** into a file (e.g. `path/to/tools.json` — a JSON **array** as produced).
4. Copy the **NDJSON** into a file (e.g. `path/to/quick-input.ndjson`).
5. Run the one-line `agentskeptic quick` command (edit paths; use `--postgres-url` for Postgres if needed).

**Outcome:** [Outcome Certificate v1](outcome-certificate-integrator.md) on **stdout** and exit 0, 1, or 2 per [quick verify](quick-verify-normative.md).

## Why this is one flow

- The **same** `POST` returns **v2** with both `draft` and `quickIngestInput.body` (deterministic synthesis from the normalized request—see [registry-draft.md](registry-draft.md#response-v2--quickingestinput)).
- You do **not** need to import `synthesizeQuickInputUtf8FromOpenAiV1` yourself for the happy path.

## Engineering

- Schemas, AJV order, and harness: [registry-draft.md](registry-draft.md).
- Kernel and CLI: [integrate.md](integrate.md), [quick-verify-normative.md](quick-verify-normative.md).
