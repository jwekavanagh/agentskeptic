/**
 * Upgrade saved WorkflowResult JSON from schemaVersion 10 → 11:
 * - step.intendedEffect string → { narrative }
 * - step.observedExecution ← { paramsCanonical } from tool_observed events (same dir or multi-effect fixture)
 *
 * Requires: `npm run build` (imports from dist/).
 * Exits non-zero if a file needs migration but params cannot be derived.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = (name) => pathToFileURL(join(root, "dist", name)).href;
const { loadEventsForWorkflow } = await import(dist("loadEvents.js"));
const { planLogicalSteps } = await import(dist("planLogicalSteps.js"));
const { canonicalJsonForParams } = await import(dist("canonicalParams.js"));

/** Corpus-negative bundles may omit `events.ndjson` on purpose; sealed debug-corpus runs pin SHA-256 in `agent-run.json`. */
const ROOTS = [join(root, "test", "golden"), join(root, "test", "fixtures"), join(root, "examples")];

function shouldMigrateFile(fp) {
  const rel = fp.replace(/\\/g, "/");
  if (rel.includes("/corpus-negative/")) return false;
  if (rel.includes("/examples/debug-corpus/")) return false;
  return true;
}

function walkJsonFiles(dir, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJsonFiles(p, out);
    else if (st.isFile() && name.endsWith(".json")) out.push(p);
  }
}

function findEventsNdjson(workflowResultPath) {
  const d = dirname(workflowResultPath);
  const local = join(d, "events.ndjson");
  if (existsSync(local)) return local;
  const rel = workflowResultPath.replace(/\\/g, "/");
  if (rel.includes("/golden/")) {
    const multi = join(root, "test", "fixtures", "multi-effect", "events.ndjson");
    if (existsSync(multi)) return multi;
  }
  if (rel.endsWith("/wf_inconsistent_result.json")) {
    const ex = join(root, "examples", "events.ndjson");
    if (existsSync(ex)) return ex;
  }
  return null;
}

function digestBySeqFromEvents(eventsPath, workflowId) {
  const { events } = loadEventsForWorkflow(eventsPath, workflowId);
  const plans = planLogicalSteps(events);
  const m = new Map();
  for (const p of plans) {
    m.set(p.seq, canonicalJsonForParams(p.last.params));
  }
  return m;
}

function migrateStep(step, digests) {
  const seq = step.seq;
  const pc = digests.get(seq);
  if (pc === undefined) {
    throw new Error(`No tool_observed seq=${seq} for workflow (cannot derive observedExecution.paramsCanonical)`);
  }
  const narrative =
    typeof step.intendedEffect === "string"
      ? step.intendedEffect
      : step.intendedEffect && typeof step.intendedEffect.narrative === "string"
        ? step.intendedEffect.narrative
        : "";
  step.intendedEffect = { narrative };
  step.observedExecution = { paramsCanonical: pc };
}

function migrateTruthStep(step, digests) {
  const seq = step.seq;
  const pc = digests.get(seq);
  if (pc === undefined) {
    throw new Error(`No tool_observed seq=${seq} for truth step`);
  }
  const narrative =
    typeof step.intendedEffect === "string"
      ? step.intendedEffect
        : step.intendedEffect && typeof step.intendedEffect.narrative === "string"
          ? step.intendedEffect.narrative
          : "";
  step.intendedEffect = { narrative };
  step.observedExecution = { paramsCanonical: pc };
}

function needsMigration(j) {
  if (!j || typeof j !== "object") return false;
  const verOld = j.schemaVersion === 10;
  const stringEffect =
    Array.isArray(j.steps) && j.steps.some((s) => s && typeof s.intendedEffect === "string");
  return verOld || stringEffect;
}

function migrateDocument(j, eventsPath) {
  const workflowId = j.workflowId;
  if (typeof workflowId !== "string") throw new Error("workflowId missing");
  const digests = digestBySeqFromEvents(eventsPath, workflowId);
  if (Array.isArray(j.steps)) {
    for (const s of j.steps) migrateStep(s, digests);
  }
  const wtr = j.workflowTruthReport;
  if (wtr && typeof wtr === "object" && !Array.isArray(wtr)) {
    if (Array.isArray(wtr.steps)) {
      for (const s of wtr.steps) migrateTruthStep(s, digests);
    }
    wtr.schemaVersion = 5;
  }
  j.schemaVersion = 11;
}

const files = [];
for (const r of ROOTS) walkJsonFiles(r, files);

let migrated = 0;
for (const fp of files) {
  if (!shouldMigrateFile(fp)) continue;
  let raw;
  try {
    raw = readFileSync(fp, "utf8");
  } catch {
    continue;
  }
  let j;
  try {
    j = JSON.parse(raw);
  } catch {
    continue;
  }
  if (!needsMigration(j)) continue;

  const eventsPath = findEventsNdjson(fp);
  if (!eventsPath) {
    console.error(`migrate-workflow-result-v11: no events.ndjson for ${fp}`);
    process.exit(1);
  }
  try {
    migrateDocument(j, eventsPath);
  } catch (e) {
    console.error(`migrate-workflow-result-v11: ${fp}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  const out = `${JSON.stringify(j)}${raw.endsWith("\n") ? "\n" : ""}`;
  writeFileSync(fp, out);
  console.log("migrated", fp);
  migrated += 1;
}

if (migrated === 0) {
  console.log("migrate-workflow-result-v11: no v10 / string intendedEffect files found (nothing to do)");
}
