#!/usr/bin/env node
import {
  CLI_OPERATIONAL_CODES,
  cliErrorEnvelope,
  formatOperationalMessage,
} from "./failureCatalog.js";
import { verifyWorkflow } from "./pipeline.js";
import { loadSchemaValidator } from "./schemaLoad.js";
import { TruthLayerError } from "./truthLayerError.js";

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

function usage(): string {
  return `Usage:
  verify-workflow --workflow-id <id> --events <path> --registry <path> --db <sqlitePath>
  verify-workflow --workflow-id <id> --events <path> --registry <path> --postgres-url <url>

Provide exactly one of --db or --postgres-url.

Exit codes:
  0  workflow status complete
  1  workflow status inconsistent
  2  workflow status incomplete
  3  operational failure (see stderr JSON)

  --help, -h  print this message and exit 0`;
}

function writeCliError(code: string, message: string): void {
  console.error(cliErrorEnvelope(code, message));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }

  const workflowId = argValue(args, "--workflow-id");
  const eventsPath = argValue(args, "--events");
  const registryPath = argValue(args, "--registry");
  const dbPath = argValue(args, "--db");
  const postgresUrl = argValue(args, "--postgres-url");

  if (!workflowId || !eventsPath || !registryPath) {
    writeCliError(CLI_OPERATIONAL_CODES.CLI_USAGE, "Missing --workflow-id, --events, or --registry.");
    process.exit(3);
  }

  const dbCount = (dbPath ? 1 : 0) + (postgresUrl ? 1 : 0);
  if (dbCount !== 1) {
    writeCliError(
      CLI_OPERATIONAL_CODES.CLI_USAGE,
      "Provide exactly one of --db or --postgres-url.",
    );
    process.exit(3);
  }

  let result;
  try {
    result = await verifyWorkflow({
      workflowId,
      eventsPath,
      registryPath,
      database: postgresUrl
        ? { kind: "postgres", connectionString: postgresUrl }
        : { kind: "sqlite", path: dbPath! },
    });
  } catch (e) {
    if (e instanceof TruthLayerError) {
      writeCliError(e.code, e.message);
      process.exit(3);
    }
    const msg = e instanceof Error ? e.message : String(e);
    writeCliError(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, formatOperationalMessage(msg));
    process.exit(3);
  }

  const validateResult = loadSchemaValidator("workflow-result");
  if (!validateResult(result)) {
    writeCliError(
      CLI_OPERATIONAL_CODES.WORKFLOW_RESULT_SCHEMA_INVALID,
      JSON.stringify(validateResult.errors ?? []),
    );
    process.exit(3);
  }

  console.log(JSON.stringify(result));

  if (result.status === "complete") process.exit(0);
  if (result.status === "inconsistent") process.exit(1);
  process.exit(2);
}

void main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(cliErrorEnvelope(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, formatOperationalMessage(msg)));
  process.exit(3);
});
