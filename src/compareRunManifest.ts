import { readFileSync } from "node:fs";
import path from "node:path";
import { CLI_OPERATIONAL_CODES } from "./cliOperationalCodes.js";
import { loadSchemaValidator } from "./schemaLoad.js";
import { TruthLayerError } from "./truthLayerError.js";

export type OutcomeCertificateRunKindForCompare = "contract_sql" | "contract_sql_langgraph_checkpoint_trust";

export type CertificateProfileV1 =
  | {
      mode: "uniform";
      outcomeCertificateRunKind: OutcomeCertificateRunKindForCompare;
    }
  | {
      mode: "perRun";
      entries: Array<{ runIndex: number; outcomeCertificateRunKind: OutcomeCertificateRunKindForCompare }>;
    };

export type CompareRunManifestEntryV1 = {
  displayLabel: string;
  workflowResult: string;
  events: string;
};

export type CompareRunManifestV1 = {
  schemaVersion: 1;
  baseDirectory: string;
  certificateProfile: CertificateProfileV1;
  runs: CompareRunManifestEntryV1[];
};

function validateProfileAgainstRuns(
  m: CompareRunManifestV1,
  baseDir: string, // for error message only
): void {
  const n = m.runs.length;
  if (m.certificateProfile.mode === "perRun") {
    const e = m.certificateProfile.entries;
    if (e.length !== n) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.COMPARE_MANIFEST_SCHEMA_INVALID,
        `certificateProfile.entries.length (${e.length}) must equal runs.length (${n})`,
      );
    }
    const want = new Set(Array.from({ length: n }, (_, i) => i));
    const got = new Set<number>();
    for (const ent of e) {
      if (got.has(ent.runIndex)) {
        throw new TruthLayerError(
          CLI_OPERATIONAL_CODES.COMPARE_MANIFEST_SCHEMA_INVALID,
          `duplicate runIndex ${ent.runIndex} in certificateProfile.entries`,
        );
      }
      got.add(ent.runIndex);
    }
    if (got.size !== n || ![...got].every((i) => want.has(i))) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.COMPARE_MANIFEST_SCHEMA_INVALID,
        `certificateProfile.entries must list runIndex 0..${n - 1} exactly once each`,
      );
    }
  }
}

/**
 * Read and validate a compare-run manifest. Resolves `baseDirectory` and validates certificate profile
 * invariants (per-run index coverage) beyond JSON Schema.
 */
export function loadCompareRunManifest(
  manifestFilePath: string,
): { manifest: CompareRunManifestV1; baseDirAbs: string; manifestFileAbs: string } {
  const manifestFileAbs = path.resolve(manifestFilePath);
  let raw: string;
  try {
    raw = readFileSync(manifestFileAbs, "utf8");
  } catch (e) {
    if (e instanceof TruthLayerError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.COMPARE_MANIFEST_READ_FAILED, msg);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.COMPARE_INPUT_JSON_SYNTAX, msg);
  }
  const v = loadSchemaValidator("compare-run-manifest-v1");
  if (!v(parsed)) {
    const detail = JSON.stringify(v.errors ?? []);
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.COMPARE_MANIFEST_SCHEMA_INVALID, detail);
  }
  const m = parsed as CompareRunManifestV1;
  validateProfileAgainstRuns(m, manifestFileAbs);
  const baseDirAbs = path.resolve(path.dirname(manifestFileAbs), m.baseDirectory);
  return { manifest: m, baseDirAbs, manifestFileAbs };
}
