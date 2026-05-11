## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `0`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `MALFORMED_ENVELOPE` | `n/a` | `false` | — / v | `` | Unknown enforcement envelope shape; open docs/ci-enforcement.md and compare stdout to hosted POST /check\|baselines\|accept 200 bodies. |

- `operator_step`: `MALFORMED_ENVELOPE`
- inner.code: `COMPLETED`

```json
{"schema_version":2,"code":"COMPLETED","unexpected_only":true}
```

**Smallest next action (operator copy)**

Fix stdout capture; expected one JSON line `{schemaVersion:2,enforce:{…}}`.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
truth_check_verdict: unknown
```

</details>
