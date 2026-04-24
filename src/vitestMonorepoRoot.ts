import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Sealed runs in examples/debug-corpus/ (see docs/agentskeptic.md). */
const REQUIRED_DEBUG_CORPUS_RUN_IDS: readonly string[] = [
  "run_ok",
  "run_value_mismatch",
  "run_row_absent",
  "run_path_nonempty",
  "run_complete_b",
] as const;

function hasFullDebugCorpus(repoRoot: string): boolean {
  const base = join(repoRoot, "examples", "debug-corpus");
  if (!existsSync(base)) return false;
  for (const id of REQUIRED_DEBUG_CORPUS_RUN_IDS) {
    if (!existsSync(join(base, id, "agent-run.json"))) {
      return false;
    }
  }
  return true;
}

/**
 * True for the top-level `agentskeptic` workspace (not `website/`, not the npm-packed stub under `node_modules` without `src/`).
 */
function isPrimaryAgentskepticWorkspaceDir(dir: string): boolean {
  const pkg = join(dir, "package.json");
  if (!existsSync(pkg)) return false;
  let name: string | undefined;
  try {
    name = (JSON.parse(readFileSync(pkg, "utf8")) as { name?: string }).name;
  } catch {
    return false;
  }
  if (name !== "agentskeptic") return false;
  return existsSync(join(dir, "src", "debugCorpus.ts")) || existsSync(join(dir, "src", "cli.ts"));
}

function firstRepoRootWithFullCorpus(candidates: string[]): string | null {
  for (const dir of candidates) {
    if (!dir) continue;
    if (isPrimaryAgentskepticWorkspaceDir(dir) && hasFullDebugCorpus(dir)) {
      return dir;
    }
  }
  return null;
}

/**
 * Resolves the agentskeptic monorepo root in Vitest.
 *
 * `process.cwd()` alone can be wrong (e.g. `website/` with a `package.json`). A strict `..` from
 * `import.meta.url` is wrong when the test URL is a transformed path. We walk from the test
 * file upward (and also try `process.cwd()`) for a `package.json#name === "agentskeptic"` root
 * that still contains the full `examples/debug-corpus` library.
 */
export function monorepoRootForVitest(importMetaUrl: string): string {
  const fromFile = dirname(fileURLToPath(importMetaUrl));
  const walk: string[] = [];
  {
    let dir: string = fromFile;
    for (let i = 0; i < 24; i++) {
      walk.push(dir);
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  const fromWalk = firstRepoRootWithFullCorpus(walk);
  if (fromWalk) {
    return fromWalk;
  }

  const cwd = process.cwd();
  const fromCwd = firstRepoRootWithFullCorpus([cwd, dirname(cwd), join(cwd, "..")]);
  if (fromCwd) {
    return fromCwd;
  }

  let listed = "(could not list)";
  try {
    const b = join(cwd, "examples", "debug-corpus");
    if (existsSync(b)) {
      listed = readdirSync(b, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
        .join(", ");
    }
  } catch {
    /* */
  }

  throw new Error(
    `monorepoRootForVitest: no agentskeptic root with all ${REQUIRED_DEBUG_CORPUS_RUN_IDS.length} demo runs. cwd=${cwd} fromFile=${fromFile} subdirs: [${listed}]`,
  );
}
