## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `2`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `VERIFY_INCOMPLETE` | `no` | `false` | — / v2 | `baseline_active` | No remediation required. |

**Verification incomplete (governance POST ok, verify exit non-zero)**

CLI exit 2 — fix verification inputs, then rerun enforce.

**Smallest next action (operator copy)**

Governance POST returned 2xx; local verify outcome incomplete—fix events/registry/db inputs and rerun `agentskeptic enforce`.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
truth_check_verdict: unknown
```

</details>
