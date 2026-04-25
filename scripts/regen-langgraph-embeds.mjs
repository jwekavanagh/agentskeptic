#!/usr/bin/env node
/**
 * Authoritative writer + --check for LangGraph LCT website embeds and Python parity goldens.
 * Prerequisite: `npm run build` (dist/cli.js).
 * Stable runEventId for B/C/D so committed JSON is deterministic across regen runs.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cli = join(root, "dist", "cli.js");
const partnerDir = join(root, "examples", "partner-quickstart");
const partnerRegistry = "examples/partner-quickstart/partner.tools.json";
const partnerSeed = readFileSync(join(partnerDir, "partner.seed.sql"), "utf8");

const EMBED_WEB = (name) => join(root, "website", "src", "content", "embeddedReports", name);
const PARITY = (id) => join(root, "python", "tests", "parity_vectors", `langgraph_lct_${id}`, "golden_certificate.json");

const OUT = {
  a2: { file: "langgraph-lct-a2-ineligible.v1.json", parityId: "a2" },
  b: { file: "langgraph-lct-b-verified.v1.json", parityId: "b" },
  c: { file: "langgraph-lct-c-mismatch.v1.json", parityId: "c" },
  d: { file: "langgraph-lct-d-incomplete.v1.json", parityId: "d" },
};

const STABLE_EVENT_IDS = {
  b: "00000000-0000-4000-8000-00000000b0b0",
  c: "00000000-0000-4000-8000-00000000c0c0",
  d: "00000000-0000-4000-8000-00000000d0d0",
};

function toolLineV3(opts) {
  const o = opts ?? {};
  const line = {
    schemaVersion: 3,
    workflowId: "wf_partner",
    runEventId: o.runEventId ?? STABLE_EVENT_IDS.b,
    type: "tool_observed",
    seq: 0,
    toolId: o.toolId ?? "crm.upsert_contact",
    params: o.params ?? { recordId: "partner_1", fields: { name: "You", status: "active" } },
    langgraphCheckpoint: o.langgraphCheckpoint ?? {
      threadId: "t-contract",
      checkpointNs: "",
      checkpointId: "cp-contract",
    },
  };
  return `${JSON.stringify(line)}\n`;
}

function seedDb() {
  const dir = mkdtempSync(join(tmpdir(), "lgct-regen-"));
  const dbPath = join(dir, "p.db");
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(partnerSeed);
  } finally {
    db.close();
  }
  return { dir, dbPath, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      AGENTSKEPTIC_TEST_THROW_ON_LOAD_EVENTS: "0",
      AGENTSKEPTIC_API_KEY: process.env.AGENTSKEPTIC_API_KEY ?? "test_langgraph_checkpoint_key",
    },
  });
}

/**
 * @param {keyof OUT} key
 * @param {{ check?: boolean, write?: boolean }} mode
 * @returns {object} parsed cert
 */
function rowScenario(key) {
  switch (key) {
    case "a2": {
      const ev = "{not-json\n";
      return { ev, argsExtra: [] };
    }
    case "b":
      return { ev: toolLineV3({ runEventId: STABLE_EVENT_IDS.b }), argsExtra: [] };
    case "c":
      return {
        ev: toolLineV3({
          runEventId: STABLE_EVENT_IDS.c,
          params: { recordId: "wrong_id", fields: { name: "You", status: "active" } },
        }),
        argsExtra: [],
      };
    case "d":
      return {
        ev: toolLineV3({ runEventId: STABLE_EVENT_IDS.d, toolId: "no.such.tool" }),
        argsExtra: ["--no-human-report"],
      };
    default:
      throw new Error("unknown key");
  }
}

function firstDiffKey(a, b, path = "") {
  if (a === b) return null;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return path || "<root>";
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return path + ".length";
    for (let i = 0; i < a.length; i++) {
      const d = firstDiffKey(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!(k in a) || !(k in b)) return path ? `${path}.${k}` : k;
    const d = firstDiffKey(a[k], b[k], path ? `${path}.${k}` : k);
    if (d) return d;
  }
  return null;
}

function readExpected(path) {
  const t = readFileSync(path, "utf8").trim();
  return JSON.parse(t);
}

function runRow(key) {
  const { dir, dbPath, cleanup } = seedDb();
  try {
    const { ev, argsExtra } = rowScenario(key);
    const evp = join(dir, `${key}.ndjson`);
    writeFileSync(evp, ev, "utf8");
    const r = run([
      "--workflow-id",
      "wf_partner",
      "--events",
      evp,
      "--registry",
      partnerRegistry,
      "--db",
      dbPath,
      "--langgraph-checkpoint-trust",
      ...argsExtra,
    ]);
    if (key === "a2" && r.status !== 2) {
      throw new Error(`[a2] expected exit 2, got ${r.status} stderr=${r.stderr}`);
    } else if (key === "b" && r.status !== 0) {
      throw new Error(`[b] expected exit 0, got ${r.status} stderr=${r.stderr}`);
    } else if (key === "c" && r.status !== 1) {
      throw new Error(`[c] expected exit 1, got ${r.status} stderr=${r.stderr}`);
    } else if (key === "d" && r.status !== 2) {
      throw new Error(`[d] expected exit 2, got ${r.status} stderr=${r.stderr}`);
    }
    const out = (r.stdout ?? "").trim();
    if (!out) {
      throw new Error(`[${key}] empty stdout, stderr=${r.stderr}`);
    }
    return JSON.parse(out);
  } finally {
    cleanup();
  }
}

function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(cli)) {
    console.error("regen-langgraph-embeds: dist/cli.js missing. Run `npm run build` from repo root.");
    process.exit(1);
  }

  for (const key of Object.keys(OUT)) {
    const meta = OUT[key];
    const webPath = EMBED_WEB(meta.file);
    const parityPath = PARITY(meta.parityId);
    const gen = runRow(/** @type {keyof OUT} */ (key));
    if (check) {
      if (!existsSync(webPath) || !existsSync(parityPath)) {
        console.error(`[${key}] missing file(s):`, webPath, parityPath);
        process.exit(1);
      }
      const expWeb = readExpected(webPath);
      const expPath = readExpected(parityPath);
      let bad = firstDiffKey(gen, expWeb);
      if (bad) {
        console.error(`[${key}] website JSON drift at key path: ${bad}`);
        process.exit(1);
      }
      bad = firstDiffKey(gen, expPath);
      if (bad) {
        console.error(`[${key}] parity golden drift at key path: ${bad}`);
        process.exit(1);
      }
    } else {
      mkdirSync(dirname(parityPath), { recursive: true });
      const text = JSON.stringify(gen, null, 2) + "\n";
      writeFileSync(webPath, text, "utf8");
      writeFileSync(parityPath, text, "utf8");
      console.error(`Wrote ${relative(root, webPath)} and ${relative(root, parityPath)}`);
    }
  }
  console.error("regen-langgraph-embeds: ok");
}

main();
