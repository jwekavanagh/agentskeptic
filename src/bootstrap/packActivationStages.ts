import type { WorkflowResult } from "../types.js";
import type { VerifyOutcomeActivationWire } from "../commercial/verifyOutcomeBeaconBody.js";

export type TrustTerminalActivation = "decision_ready" | "contract_inconsistent" | "contract_incomplete";

export type ActivationManifestDiskV1 = {
  schemaVersion: 1;
  cliCommand: "activate";
  workflowId: string;
  trustTerminal: TrustTerminalActivation;
  finishedAt: string;
  stages: readonly [
    {
      id: "ingest_input";
      status: "complete" | "failed" | "skipped";
      trustLabel: StageTrustDisk;
    },
    {
      id: "provisional_infer";
      status: "complete" | "failed" | "skipped";
      trustLabel: StageTrustDisk;
    },
    {
      id: "contract_verify";
      status: "complete" | "failed" | "skipped";
      trustLabel: StageTrustDisk;
    },
    {
      id: "proof_export";
      status: "complete" | "failed" | "skipped";
      trustLabel: StageTrustDisk;
    },
  ];
};

type StageTrustDisk =
  | "n_a"
  | "provisional_pass"
  | "decision_ready"
  | "contract_inconsistent"
  | "contract_incomplete";

export function activationTrustTerminalFromWorkflow(result: WorkflowResult): TrustTerminalActivation {
  if (result.status === "complete") return "decision_ready";
  if (result.status === "inconsistent") return "contract_inconsistent";
  return "contract_incomplete";
}

export function buildActivationManifestDisk(workflowId: string, terminal: TrustTerminalActivation): ActivationManifestDiskV1 {
  const finishedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    cliCommand: "activate",
    workflowId,
    trustTerminal: terminal,
    finishedAt,
    stages: [
      {
        id: "ingest_input",
        status: "complete",
        trustLabel: "n_a",
      },
      {
        id: "provisional_infer",
        status: "complete",
        trustLabel: "provisional_pass",
      },
      {
        id: "contract_verify",
        status: "complete",
        trustLabel: terminal,
      },
      {
        id: "proof_export",
        status: "complete",
        trustLabel: terminal,
      },
    ],
  };
}

export function activationWireFromManifestDisk(manifest: ActivationManifestDiskV1): VerifyOutcomeActivationWire {
  const stages = manifest.stages.map((row) => ({
    id: row.id,
    status: row.status,
    trust_label: row.trustLabel,
  }));
  return {
    trust_terminal: manifest.trustTerminal,
    stages: stages as VerifyOutcomeActivationWire["stages"],
  };
}

export function stderrMachineLinesActivateBeforeProof(terminal: TrustTerminalActivation): string {
  return (
    `AGENTSKEPTIC_ACTIVATION stage=provisional_infer trust_terminal=provisional_pass\n` +
    `AGENTSKEPTIC_ACTIVATION stage=contract_verify trust_terminal=${terminal}\n`
  );
}

export function stderrMachineLineProofExport(terminal: TrustTerminalActivation): string {
  return `AGENTSKEPTIC_ACTIVATION stage=proof_export path=proof trust_terminal=${terminal}\n`;
}
