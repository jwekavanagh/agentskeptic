## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `4`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `RERUN_FAIL` | `yes` | `true` | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` / v7 | `action_required` | Rerun failed. |

**Smallest next action (operator copy)**

Rerun still mismatched; reconcile evidence or follow accept path if pins present.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
{"schemaVersion":2,"kind":"execution_truth_layer_error","code":"VERIFICATION_OUTPUT_LOCK_MISMATCH","message":"Hosted enforce reported rerun failure against baseline.","failureDiagnosis":{"summary":"fail","actionableFailure":{"category":"governance","severity":"error","recommendedAction":"reconcile","automationSafe":false}}}
```

</details>
