import { mkdirSync, mkdtempSync, copyFileSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { TruthLayerError } from "./truthLayerError.js";
import { verifyAgentskepticImpl } from "./verifyAgentskeptic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function seedTempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "as-verify-facade-"));
  const agentskepticDir = join(dir, "agentskeptic");
  mkdirSync(agentskepticDir, { recursive: true });
  copyFileSync(join(repoRoot, "examples", "events.ndjson"), join(agentskepticDir, "events.ndjson"));
  copyFileSync(join(repoRoot, "examples", "tools.json"), join(agentskepticDir, "tools.json"));
  const dbPath = join(dir, "demo.db");
  const seed = readFileSync(join(repoRoot, "examples", "seed.sql"), "utf8");
  const db = new DatabaseSync(dbPath);
  db.exec(seed);
  db.close();
  return dir;
}

describe("verifyAgentskeptic", () => {
  it("wf_complete: contract certificate matches expectations and permits high-stakes reliance", async () => {
    const projectRoot = seedTempProject();
    try {
      const dbPath = join(projectRoot, "demo.db");
      const certificate = await verifyAgentskepticImpl({
        workflowId: "wf_complete",
        databaseUrl: dbPath,
        projectRoot,
      });
      expect(certificate.stateRelation).toBe("matches_expectations");
      expect(certificate.highStakesReliance).toBe("permitted");
      expect(certificate.runKind).toBe("contract_sql");
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("wf_missing: mismatch and prohibited reliance; explanation cites ROW_ABSENT", async () => {
    const projectRoot = seedTempProject();
    try {
      const dbPath = join(projectRoot, "demo.db");
      const certificate = await verifyAgentskepticImpl({
        workflowId: "wf_missing",
        databaseUrl: dbPath,
        projectRoot,
      });
      expect(certificate.stateRelation).toBe("does_not_match");
      expect(certificate.highStakesReliance).toBe("prohibited");
      expect(certificate.explanation.details.some((d) => d.code === "ROW_ABSENT")).toBe(true);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it("throws when agentskeptic/tools.json is missing", async () => {
    const projectRoot = seedTempProject();
    try {
      unlinkSync(join(projectRoot, "agentskeptic", "tools.json"));
      await expect(
        verifyAgentskepticImpl({
          workflowId: "wf_complete",
          databaseUrl: join(projectRoot, "demo.db"),
          projectRoot,
        }),
      ).rejects.toThrow(TruthLayerError);

      try {
        await verifyAgentskepticImpl({
          workflowId: "wf_complete",
          databaseUrl: join(projectRoot, "demo.db"),
          projectRoot,
        });
      } catch (e) {
        expect(e).toBeInstanceOf(TruthLayerError);
        const msg = String((e as Error).message);
        expect(msg).toContain(path.normalize(join(projectRoot, "agentskeptic", "tools.json")));
      }
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
