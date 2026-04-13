import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { runLicensePreflightIfNeeded } from "../commercial/licensePreflight.js";
import { CLI_OPERATIONAL_CODES } from "../cliOperationalCodes.js";
import {
  cliErrorEnvelope,
  formatOperationalMessage,
} from "../failureCatalog.js";
import { verifyWorkflow } from "../pipeline.js";
import { loadSchemaValidator } from "../schemaLoad.js";
import { TruthLayerError } from "../truthLayerError.js";
import type { VerificationDatabase } from "../types.js";
import type { WorkflowResult } from "../types.js";
import { formatDistributionFooter } from "../distributionFooter.js";
import { atomicWriteUtf8File } from "../quickVerify/atomicWrite.js";
import { buildQuickContractEventsNdjson } from "../quickVerify/buildQuickContractEventsNdjson.js";
import { stableStringify } from "../quickVerify/canonicalJson.js";
import { runQuickVerifyToValidatedReport } from "../quickVerify/runQuickVerify.js";
import { emitVerifyWorkflowCliJsonAndExitByStatus } from "../standardVerifyWorkflowCli.js";
import { buildBootstrapReadmeMarkdown } from "./bootstrapReadmeTemplate.js";
import { parseBootstrapPackInputJson } from "./parseBootstrapPackInput.js";
import { synthesizeQuickInputUtf8FromOpenAiV1 } from "./synthesizeQuickInputFromOpenAiV1.js";
import { argValue } from "../cliArgv.js";

const ALLOWED_BOOTSTRAP_FLAGS = new Set([
  "--input",
  "--out",
  "--db",
  "--postgres-url",
  "--help",
  "-h",
]);

function usageBootstrap(): string {
  return `Usage:
  agentskeptic bootstrap --input <path> (--db <sqlitePath> | --postgres-url <url>) --out <path>

Builds a contract pack (events.ndjson, tools.json, quick-report.json, README.bootstrap.md) from
BootstrapPackInput v1 JSON + read-only SQL, then replays contract verify in-process.

Exit codes:
  0  Quick pass with exports and contract verify complete (stdout: bootstrap result envelope; stderr empty)
  1  contract verify inconsistent (stdout/stderr: same as agentskeptic verify)
  2  Quick not pass / no exports / contract verify incomplete (stderr: JSON envelope for quick-path; else same as verify)
  3  operational failure (stderr: JSON envelope)

  --help, -h  print this message and exit 0

Normative: docs/bootstrap-pack-normative.md`;
}

function assertBootstrapArgsWellFormed(args: string[]): void {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "-h" || a === "--help") continue;
    if (!a.startsWith("--")) {
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_USAGE, `Unexpected argument: ${a}`);
    }
    if (!ALLOWED_BOOTSTRAP_FLAGS.has(a)) {
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_USAGE, `Unknown option: ${a}`);
    }
    if (a === "--input" || a === "--out" || a === "--db" || a === "--postgres-url") {
      const v = args[i + 1];
      if (v === undefined || v.startsWith("--")) {
        throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_USAGE, `Missing value after ${a}.`);
      }
      i++;
    }
  }
}

export type ParsedBootstrapCli = {
  inputPath: string;
  outPath: string;
  dbPath: string | undefined;
  postgresUrl: string | undefined;
};

export function parseBootstrapCliArgs(args: string[]): ParsedBootstrapCli {
  assertBootstrapArgsWellFormed(args);
  const inputPath = argValue(args, "--input");
  const outPath = argValue(args, "--out");
  const dbPath = argValue(args, "--db");
  const postgresUrl = argValue(args, "--postgres-url");
  if (!inputPath || !outPath) {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_USAGE, "Missing --input or --out.");
  }
  const dbCount = (dbPath ? 1 : 0) + (postgresUrl ? 1 : 0);
  if (dbCount !== 1) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.BOOTSTRAP_USAGE,
      "Provide exactly one of --db or --postgres-url.",
    );
  }
  return { inputPath, outPath, dbPath, postgresUrl };
}

function writeBootstrapCliError(code: string, message: string): void {
  console.error(cliErrorEnvelope(code, formatOperationalMessage(message)));
}

function cleanupOutDir(outResolved: string): void {
  try {
    rmSync(outResolved, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}

export async function runBootstrapSubcommand(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usageBootstrap());
    process.exit(0);
  }

  let parsed: ParsedBootstrapCli;
  try {
    parsed = parseBootstrapCliArgs(args);
  } catch (e) {
    if (e instanceof TruthLayerError) {
      writeBootstrapCliError(e.code, e.message);
      process.exit(3);
    }
    throw e;
  }

  const outResolved = path.resolve(parsed.outPath);
  if (existsSync(outResolved)) {
    writeBootstrapCliError(
      CLI_OPERATIONAL_CODES.BOOTSTRAP_OUT_EXISTS,
      `--out already exists: ${outResolved}`,
    );
    process.exit(3);
  }

  let rawInput: string;
  try {
    rawInput = readFileSync(path.resolve(parsed.inputPath), "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    writeBootstrapCliError(CLI_OPERATIONAL_CODES.BOOTSTRAP_USAGE, `Cannot read --input: ${msg}`);
    process.exit(3);
  }

  let packInput: ReturnType<typeof parseBootstrapPackInputJson>;
  try {
    packInput = parseBootstrapPackInputJson(rawInput);
  } catch (e) {
    if (e instanceof TruthLayerError) {
      writeBootstrapCliError(e.code, e.message);
      process.exit(3);
    }
    throw e;
  }

  try {
    await runLicensePreflightIfNeeded("verify");
  } catch (e) {
    if (e instanceof TruthLayerError) {
      writeBootstrapCliError(e.code, e.message);
      process.exit(3);
    }
    const msg = e instanceof Error ? e.message : String(e);
    writeBootstrapCliError(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, formatOperationalMessage(msg));
    process.exit(3);
  }

  mkdirSync(outResolved, { recursive: false });

  const database: VerificationDatabase = parsed.postgresUrl
    ? { kind: "postgres", connectionString: parsed.postgresUrl }
    : { kind: "sqlite", path: path.resolve(parsed.dbPath!) };

  const inputUtf8 = synthesizeQuickInputUtf8FromOpenAiV1(packInput);

  let report: Awaited<ReturnType<typeof runQuickVerifyToValidatedReport>>["report"];
  let registryUtf8: string;
  let contractExports: Awaited<ReturnType<typeof runQuickVerifyToValidatedReport>>["contractExports"];
  try {
    const out = await runQuickVerifyToValidatedReport({
      inputUtf8,
      postgresUrl: parsed.postgresUrl ?? undefined,
      sqlitePath: parsed.dbPath !== undefined ? path.resolve(parsed.dbPath) : undefined,
    });
    report = out.report;
    registryUtf8 = out.registryUtf8;
    contractExports = out.contractExports;
  } catch (e) {
    cleanupOutDir(outResolved);
    if (e instanceof TruthLayerError) {
      writeBootstrapCliError(e.code, e.message);
      process.exit(3);
    }
    const msg = e instanceof Error ? e.message : String(e);
    writeBootstrapCliError(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, formatOperationalMessage(msg));
    process.exit(3);
  }

  if (report.verdict !== "pass") {
    cleanupOutDir(outResolved);
    writeBootstrapCliError(
      CLI_OPERATIONAL_CODES.BOOTSTRAP_QUICK_NOT_PASS,
      `Quick Verify verdict was "${report.verdict}" (expected pass).`,
    );
    process.exit(2);
  }
  if (contractExports.length === 0) {
    cleanupOutDir(outResolved);
    writeBootstrapCliError(
      CLI_OPERATIONAL_CODES.BOOTSTRAP_NO_EXPORTABLE_TOOLS,
      "Quick Verify produced zero exportable tools for contract replay.",
    );
    process.exit(2);
  }

  const eventsPath = path.join(outResolved, "events.ndjson");
  const toolsPath = path.join(outResolved, "tools.json");
  const quickReportPath = path.join(outResolved, "quick-report.json");
  const readmePath = path.join(outResolved, "README.bootstrap.md");

  try {
    atomicWriteUtf8File(toolsPath, registryUtf8);
    atomicWriteUtf8File(
      eventsPath,
      buildQuickContractEventsNdjson({
        workflowId: packInput.workflowId,
        exports: contractExports,
      }),
    );
    atomicWriteUtf8File(quickReportPath, `${stableStringify(report)}\n`);
    atomicWriteUtf8File(readmePath, buildBootstrapReadmeMarkdown(packInput.workflowId));
  } catch (e) {
    cleanupOutDir(outResolved);
    const msg = e instanceof Error ? e.message : String(e);
    writeBootstrapCliError(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, formatOperationalMessage(`pack write: ${msg}`));
    process.exit(3);
  }

  let truthBuffered = "";
  let result: WorkflowResult;
  try {
    result = await verifyWorkflow({
      workflowId: packInput.workflowId,
      eventsPath,
      registryPath: toolsPath,
      database,
      truthReport: (r) => {
        truthBuffered = r;
      },
    });
  } catch (e) {
    cleanupOutDir(outResolved);
    if (e instanceof TruthLayerError) {
      writeBootstrapCliError(e.code, e.message);
      process.exit(3);
    }
    const msg = e instanceof Error ? e.message : String(e);
    writeBootstrapCliError(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, formatOperationalMessage(msg));
    process.exit(3);
  }

  const validateResult = loadSchemaValidator("workflow-result");
  if (!validateResult(result)) {
    cleanupOutDir(outResolved);
    writeBootstrapCliError(
      CLI_OPERATIONAL_CODES.WORKFLOW_RESULT_SCHEMA_INVALID,
      JSON.stringify(validateResult.errors ?? []),
    );
    process.exit(3);
  }

  if (result.status === "complete") {
    const envelope = {
      schemaVersion: 1,
      kind: "agentskeptic_bootstrap_result",
      workflowId: packInput.workflowId,
      outDir: outResolved,
      quickVerdict: "pass",
      verifyStatus: "complete",
      exportedToolCount: contractExports.length,
    };
    try {
      process.stdout.write(`${JSON.stringify(envelope)}\n`);
    } catch (e) {
      cleanupOutDir(outResolved);
      const msg = e instanceof Error ? e.message : String(e);
      writeBootstrapCliError(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, formatOperationalMessage(`stdout: ${msg}`));
      process.exit(3);
    }
    process.exit(0);
  }

  process.stderr.write(`${truthBuffered}\n`);
  process.stderr.write(formatDistributionFooter());
  const exitWithCleanup = (code: number): void => {
    cleanupOutDir(outResolved);
    process.exit(code);
  };
  emitVerifyWorkflowCliJsonAndExitByStatus(result, {
    consoleLog: (line) => {
      console.log(line);
    },
    exit: exitWithCleanup,
  });
}
