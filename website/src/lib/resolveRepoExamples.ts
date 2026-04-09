import { existsSync } from "node:fs";
import path from "node:path";

export type RepoExamplesPaths = {
  examplesDir: string;
  eventsNdjson: string;
  toolsJson: string;
  demoDb: string;
};

/**
 * Resolve repo `examples/` whether cwd is `website/` or monorepo root.
 */
export function resolveRepoExamplesPaths(): RepoExamplesPaths {
  const candidates = [
    path.join(process.cwd(), "examples"),
    path.join(process.cwd(), "..", "examples"),
  ];
  for (const examplesDir of candidates) {
    const demoDb = path.join(examplesDir, "demo.db");
    const eventsNdjson = path.join(examplesDir, "events.ndjson");
    const toolsJson = path.join(examplesDir, "tools.json");
    if (existsSync(demoDb) && existsSync(eventsNdjson) && existsSync(toolsJson)) {
      return {
        examplesDir,
        eventsNdjson,
        toolsJson,
        demoDb,
      };
    }
  }
  throw new DemoFixturesMissingError(
    `examples fixtures not found (tried ${candidates.join(", ")}; cwd=${process.cwd()})`,
  );
}

export class DemoFixturesMissingError extends Error {
  readonly code = "DEMO_FIXTURES_MISSING" as const;
  constructor(message: string) {
    super(message);
    this.name = "DemoFixturesMissingError";
  }
}
