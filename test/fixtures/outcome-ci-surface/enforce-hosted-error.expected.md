## AgentSkeptic truth check

- mode: `enforce`
- cli_exit: `3`

### Governance (enforce)

| Governance outcome | Drift | Accept available | Pins / lifecycle_version | Lifecycle state | Smallest next action |
| --- | --- | --- | --- | --- | --- |
| `HOSTED_OR_USAGE_ERROR` | `n/a` | `false` | — / v | `` | Upgrade required. |

**Smallest next action (operator copy)**

Fix API key, reserve, or server error; see stderr `cliErrorEnvelope`.

### Outcome Certificate artifact

_(not uploaded — stdout did not parse as Outcome Certificate v3)_
<details><summary>CLI stderr (last 80 lines)</summary>

```text
truth_check_verdict: unknown
{"schemaVersion":2,"kind":"execution_truth_layer_error","code":"ENFORCEMENT_REQUIRES_PAID_PLAN","message":"Upgrade required.","failureDiagnosis":{"summary":"plan","actionableFailure":{"category":"billing","severity":"high","recommendedAction":"upgrade","automationSafe":false}}}
```

</details>
