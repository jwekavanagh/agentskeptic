import path from "node:path";
import { CLI_OPERATIONAL_CODES } from "./failureCatalog.js";
import { loadEventsForWorkflow } from "./loadEvents.js";
import { classifyLangGraphCheckpointTrustEligibility } from "./langGraphCheckpointTrustGate.js";
import {
  buildIneligibleLangGraphCheckpointTrustCertificate,
  buildOutcomeCertificateLangGraphCheckpointTrustFromWorkflowResult,
  type OutcomeCertificateV1,
} from "./outcomeCertificate.js";
import { loadSchemaValidator } from "./schemaLoad.js";
import { TruthLayerError } from "./truthLayerError.js";
import type { VerificationDatabase, VerificationPolicy, WorkflowResult } from "./types.js";
import { verifyRunStateFromBufferedRunEvents } from "./verifyRunStateFromBufferedRunEvents.js";

export async function runLangGraphCheckpointTrustBatchVerifyToTerminalResult(input: {
  workflowId: string;
  eventsPath: string;
  registryPath: string;
  database: VerificationDatabase;
  verificationPolicy: VerificationPolicy;
  projectRoot?: string;
  logStep?: (line: object) => void;
  truthReport?: (report: string) => void;
}): Promise<{ workflowResult: WorkflowResult; certificate: OutcomeCertificateV1 }> {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  const load = loadEventsForWorkflow(input.eventsPath, input.workflowId);
  const eligibility = classifyLangGraphCheckpointTrustEligibility({
    runLevelReasons: load.runLevelReasons,
    toolObservedEvents: load.events,
  });
  const logStep = input.logStep ?? (() => {});
  const truthReport = input.truthReport ?? (() => {});

  if (!eligibility.eligible) {
    const workflowResult = await verifyRunStateFromBufferedRunEvents({
      workflowId: input.workflowId,
      registryPath: input.registryPath,
      database: input.database,
      projectRoot,
      bufferedRunEvents: [],
      runLevelReasons: eligibility.certificateReasons,
      verificationPolicy: input.verificationPolicy,
      logStep,
      truthReport,
    });
    const validateWf = loadSchemaValidator("workflow-result");
    if (!validateWf(workflowResult)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.WORKFLOW_RESULT_SCHEMA_INVALID,
        JSON.stringify(validateWf.errors ?? []),
      );
    }
    const certificate = buildIneligibleLangGraphCheckpointTrustCertificate(
      input.workflowId,
      eligibility.certificateReasons,
    );
    const validateCert = loadSchemaValidator("outcome-certificate-v1");
    if (!validateCert(certificate)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.WORKFLOW_RESULT_SCHEMA_INVALID,
        JSON.stringify(validateCert.errors ?? []),
      );
    }
    return { workflowResult, certificate };
  }

  const workflowResult = await verifyRunStateFromBufferedRunEvents({
    workflowId: input.workflowId,
    registryPath: input.registryPath,
    database: input.database,
    projectRoot,
    bufferedRunEvents: load.runEvents,
    runLevelReasons: load.runLevelReasons,
    verificationPolicy: input.verificationPolicy,
    logStep,
    truthReport,
  });
  const validateWf = loadSchemaValidator("workflow-result");
  if (!validateWf(workflowResult)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.WORKFLOW_RESULT_SCHEMA_INVALID,
      JSON.stringify(validateWf.errors ?? []),
    );
  }
  const certificate = buildOutcomeCertificateLangGraphCheckpointTrustFromWorkflowResult(workflowResult);
  const validateCert = loadSchemaValidator("outcome-certificate-v1");
  if (!validateCert(certificate)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.WORKFLOW_RESULT_SCHEMA_INVALID,
      JSON.stringify(validateCert.errors ?? []),
    );
  }
  return { workflowResult, certificate };
}
