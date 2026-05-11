## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `0`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `ACCEPT_RECORDED_RERUN_CHECK` | `n/a` | `false` | accepted:`9999999999999999999999999999999999999999999999999999999999999999` / v8 | `rerun_required` | Rerun POST /check. |

**Smallest next action (operator copy)**

Accept recorded; run steady `enforce` check to return to trusted posture.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
truth_check_verdict: trusted
```

</details>
