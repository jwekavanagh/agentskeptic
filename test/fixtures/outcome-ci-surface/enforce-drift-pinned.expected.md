## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `4`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `ACCEPT_DRIFT_PINNED` | `yes` | `true` | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` / v4 | `action_required` | Drift detected. |

**Smallest next action (operator copy)**

Set `AGENTSKEPTIC_ENFORCE_EXPECTED_PROJECTION_HASH` and `AGENTSKEPTIC_ENFORCE_LIFECYCLE_STATE_VERSION` from table pins; run `agentskeptic enforce … --accept-drift`; then rerun steady `enforce` check.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
{"schemaVersion":2,"kind":"execution_truth_layer_error","code":"VERIFICATION_OUTPUT_LOCK_MISMATCH","message":"Drift detected.","failureDiagnosis":{"summary":"drift","actionableFailure":{"category":"governance","severity":"error","recommendedAction":"accept_or_reconcile","automationSafe":false}}}
```

</details>
