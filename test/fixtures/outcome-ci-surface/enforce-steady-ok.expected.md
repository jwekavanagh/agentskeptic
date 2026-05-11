## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `0`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `STEADY_OK` | `no` | `false` | — / v3 | `baseline_active` | No remediation required. |

**Smallest next action (operator copy)**

Continue recurring `enforce` checks on PRs/default branch.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
truth_check_verdict: trusted
```

</details>
