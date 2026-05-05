/**
 * Rewrites test/golden/wf_multi_{ok,partial,all_fail}.{stdout.json,stderr.txt} from verifyWorkflow + SQLite seed.
 * Run after build: npm run build && node scripts/regen-multi-effect-pipeline-goldens.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { verifyWorkflow } from "../dist/pipeline.js";
import { formatWorkflowTruthReport } from "../dist/workflowTruthReport.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "regen-multi-effect-"));
const dbPath = join(dir, "test.db");
const db = new DatabaseSync(dbPath);
db.exec(readFileSync(join(root, "examples", "seed.sql"), "utf8"));
db.close();

const eventsMulti = join(root, "test/fixtures/multi-effect/events.ndjson");
const registryMulti = join(root, "test/fixtures/multi-effect/tools.json");
const goldenDir = join(root, "test/golden");
const noopLog = () => {};
const sqliteDb = () => ({ kind: "sqlite", path: dbPath });

for (const wfId of ["wf_multi_ok", "wf_multi_partial", "wf_multi_all_fail"]) {
  const r = await verifyWorkflow({
    workflowId: wfId,
    eventsPath: eventsMulti,
    registryPath: registryMulti,
    database: sqliteDb(),
    logStep: noopLog,
    truthReport: () => {},
  });
  writeFileSync(join(goldenDir, `${wfId}.stdout.json`), `${JSON.stringify(r)}\n`, "utf8");
  writeFileSync(join(goldenDir, `${wfId}.stderr.txt`), `${formatWorkflowTruthReport(r)}\n`, "utf8");
}

rmSync(dir, { recursive: true, force: true });
console.error("regen-multi-effect-pipeline-goldens: wrote wf_multi_ok, wf_multi_partial, wf_multi_all_fail");
