import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { loadSchemaValidator } from "../schemaLoad.js";
import { atomicWriteUtf8File } from "../quickVerify/atomicWrite.js";
import type { OutcomeCertificateV1 } from "../outcomeCertificate.js";
import type { WorkflowResult } from "../types.js";

export type LocalRunHistoryEntry = {
  workflowId: string;
  capturedAt: string;
  runDir: string;
  workflowResultPath: string;
  eventsPath: string;
  outcomeCertificatePath: string;
};

export type LocalRunHistoryIndexV1 = {
  schemaVersion: 1;
  runs: LocalRunHistoryEntry[];
};

export type StoreLoopRunInput = {
  workflowId: string;
  eventsPath: string;
  workflowResult: WorkflowResult;
  certificate: OutcomeCertificateV1;
  maxRuns: number;
};

export function loopStoreRoot(): string {
  return path.join(homedir(), ".agentskeptic", "runs");
}

function indexPath(root: string): string {
  return path.join(root, "index.json");
}

function readIndexOrEmpty(root: string): LocalRunHistoryIndexV1 {
  const p = indexPath(root);
  if (!existsSync(p)) return { schemaVersion: 1, runs: [] };
  let raw = "";
  try {
    raw = readFileSync(p, "utf8");
  } catch {
    return { schemaVersion: 1, runs: [] };
  }
  if (raw.trim() === "") return { schemaVersion: 1, runs: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    const validate = loadSchemaValidator("local-run-history-index-v1");
    if (!validate(parsed)) {
      return { schemaVersion: 1, runs: [] };
    }
    return parsed as LocalRunHistoryIndexV1;
  } catch {
    return { schemaVersion: 1, runs: [] };
  }
}

function persistIndex(root: string, index: LocalRunHistoryIndexV1): void {
  mkdirSync(root, { recursive: true });
  atomicWriteUtf8File(indexPath(root), `${JSON.stringify(index, null, 2)}\n`);
}

function createRunDirName(capturedAt: string): string {
  const stamp = capturedAt.replace(/[:.]/g, "-");
  return `${stamp}-${randomUUID()}`;
}

export function loadLocalRunHistory(root = loopStoreRoot()): LocalRunHistoryIndexV1 {
  return readIndexOrEmpty(root);
}

export function latestCompatiblePriorRun(
  workflowId: string,
  root = loopStoreRoot(),
): LocalRunHistoryEntry | null {
  const index = readIndexOrEmpty(root);
  for (let i = index.runs.length - 1; i >= 0; i--) {
    const run = index.runs[i]!;
    if (run.workflowId !== workflowId) continue;
    if (!existsSync(run.workflowResultPath) || !existsSync(run.eventsPath)) continue;
    return run;
  }
  return null;
}

export function storeLoopRun(input: StoreLoopRunInput, root = loopStoreRoot()): LocalRunHistoryEntry {
  const capturedAt = new Date().toISOString();
  const runDir = path.join(root, createRunDirName(capturedAt));
  mkdirSync(runDir, { recursive: true });

  const eventsDst = path.join(runDir, "events.ndjson");
  const resultDst = path.join(runDir, "workflow-result.json");
  const certDst = path.join(runDir, "outcome-certificate.json");

  copyFileSync(path.resolve(input.eventsPath), eventsDst);
  writeFileSync(resultDst, `${JSON.stringify(input.workflowResult, null, 2)}\n`, "utf8");
  writeFileSync(certDst, `${JSON.stringify(input.certificate, null, 2)}\n`, "utf8");

  const entry: LocalRunHistoryEntry = {
    workflowId: input.workflowId,
    capturedAt,
    runDir,
    workflowResultPath: resultDst,
    eventsPath: eventsDst,
    outcomeCertificatePath: certDst,
  };

  const index = readIndexOrEmpty(root);
  index.runs.push(entry);
  const maxRuns = Math.max(1, Math.floor(input.maxRuns));
  while (index.runs.length > maxRuns) {
    const removed = index.runs.shift();
    if (!removed) break;
    try {
      rmSync(removed.runDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
  persistIndex(root, index);
  return entry;
}
