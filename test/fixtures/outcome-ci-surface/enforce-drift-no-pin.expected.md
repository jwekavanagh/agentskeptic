## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `4`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `DRIFT_NO_PIN` | `yes` | `false` | — / v4 | `action_required` | Drift without pin. |

**Smallest next action (operator copy)**

Drift without accept pin—follow `next_action` from API and docs/ci-enforcement.md.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
{"schemaVersion":2,"kind":"execution_truth_layer_error","code":"VERIFICATION_OUTPUT_LOCK_MISMATCH","message":"Drift detected.","failureDiagnosis":{"summary":"drift","actionableFailure":{"category":"governance","severity":"error","recommendedAction":"reconcile","automationSafe":false}}}
```

</details>
