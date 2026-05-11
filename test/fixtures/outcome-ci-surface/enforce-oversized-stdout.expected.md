## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `0`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `OVERSIZED_STDOUT` | `n/a` | `false` | — / v | `` | Fix stdout capture; expected one JSON line `{schemaVersion:2,enforce:{…}}`. |

**Smallest next action (operator copy)**

Fix stdout capture; expected one JSON line `{schemaVersion:2,enforce:{…}}`.

### Operational presentation (no certificate)

- reason: `oversized`
- The CLI did not emit a parseable Outcome Certificate v3 on stdout.
- This summary therefore omits trust spine, failing-steps table, and artifact upload.
### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
truth_check_verdict: unknown
```

</details>
