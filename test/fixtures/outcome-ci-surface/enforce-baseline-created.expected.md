## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `0`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `BASELINE_CREATED` | `n/a` | `false` | — / v1 | `baseline_active` | Baseline established. |

**Smallest next action (operator copy)**

Baseline established; switch CI to steady `enforce` without `--create-baseline`.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
truth_check_verdict: trusted
```

</details>
