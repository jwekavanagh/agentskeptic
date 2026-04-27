import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function flag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function runInitCommand(args: string[]): void {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`Usage: agentskeptic init --framework <next|none> --database sqlite [--yes] [--force]

Scaffolds agentskeptic/tools.json, agentskeptic/events.ndjson, demo.db (SQLite seed), and a verify script.
v2.0 supports only SQLite. Other databases are deferred.

  --framework next   Next.js App Router API route + package.json snippet
  --framework none     Plain Node verify via CLI
  --yes                Non-interactive (default answers)
  --force              Overwrite existing agentskeptic/ files

Examples:
  npx agentskeptic init --framework none --database sqlite --yes
  npx agentskeptic init --framework next --database sqlite --yes
`);
    process.exit(0);
  }

  const framework = argValue(args, "--framework");
  const database = argValue(args, "--database");
  const yes = flag(args, "--yes");
  const force = flag(args, "--force");

  if (!yes) {
    process.stderr.write("This non-interactive scaffolder requires --yes in v2.0.\n");
    process.exit(2);
  }

  if (database && database !== "sqlite") {
    process.stderr.write(`Only --database sqlite is supported in v2.0 (got ${database}).\n`);
    process.exit(2);
  }

  if (framework !== "next" && framework !== "none") {
    process.stderr.write(`Unsupported --framework ${framework}; use next or none.\n`);
    process.exit(2);
  }

  const assetDir = join(__dirname, "init-starter");
  if (!existsSync(join(assetDir, "tools.json"))) {
    process.stderr.write(
      "Init assets missing (dist/cli/init-starter). Re-run npm run build so examples are copied.\n",
    );
    process.exit(3);
  }

  const cwd = process.cwd();
  const agentskepticDir = join(cwd, "agentskeptic");
  if (existsSync(agentskepticDir) && !force) {
    process.stderr.write("agentskeptic/ already exists. Pass --force to overwrite.\n");
    process.exit(2);
  }
  mkdirSync(agentskepticDir, { recursive: true });
  copyFileSync(join(assetDir, "tools.json"), join(agentskepticDir, "tools.json"));
  copyFileSync(join(assetDir, "events.ndjson"), join(agentskepticDir, "events.ndjson"));

  const dbPath = join(cwd, "demo.db");
  if (existsSync(dbPath) && !force) {
    process.stderr.write("demo.db already exists. Pass --force to overwrite.\n");
    process.exit(2);
  }
  const seedSql = readFileSync(join(assetDir, "seed.sql"), "utf8");
  const db = new DatabaseSync(dbPath);
  db.exec(seedSql);
  db.close();

  const pkgScript = `"verify:agentskeptic": "agentskeptic --workflow-id wf_complete --events agentskeptic/events.ndjson --registry agentskeptic/tools.json --db demo.db"`;

  if (framework === "none") {
    const readme = `# AgentSkeptic starter

Run verification (expects \`agentskeptic\` on PATH from npm install):

\`\`\`bash
npm install agentskeptic
npm run verify:agentskeptic
\`\`\`

Add to package.json scripts:
${pkgScript}
`;
    writeFileSync(join(cwd, "AGENTSKEPTIC-INIT.md"), readme, "utf8");
  }

  if (framework === "next") {
    const appDir = join(cwd, "src", "app", "api", "agentskeptic-verify");
    mkdirSync(appDir, { recursive: true });
    const routeSrc = `import { join } from "node:path";
import { AgentSkeptic } from "agentskeptic";
import { createNextRouteHandler } from "agentskeptic/next";

const skeptic = new AgentSkeptic({
  registryPath: join(process.cwd(), "agentskeptic", "tools.json"),
  databaseUrl: join(process.cwd(), "demo.db"),
});

export const POST = createNextRouteHandler(
  skeptic,
  async (gate, req) => {
    const body = (await req.json()) as { events?: Array<Record<string, unknown>> };
    for (const ev of body.events ?? []) {
      gate.appendRunEvent(ev);
    }
    const certificate = await gate.evaluateCertificate();
    return {
      stateRelation: certificate.stateRelation,
      runKind: certificate.runKind,
    };
  },
  { defaultWorkflowId: "wf_complete" },
);
`;
    writeFileSync(join(appDir, "route.ts"), routeSrc, "utf8");
    const nextReadme = `# AgentSkeptic Next.js starter

1. \`npm install agentskeptic next react react-dom\`
2. \`npm run dev\` and POST JSON to \`/api/agentskeptic-verify\`:
   \`\`\`json
   { "events": [ /* tool_observed run events for wf_complete */ ] }
   \`\`\`

Local batch verify without Next dev server:

\`\`\`bash
npx agentskeptic --workflow-id wf_complete --events agentskeptic/events.ndjson --registry agentskeptic/tools.json --db demo.db
\`\`\`
`;
    writeFileSync(join(cwd, "AGENTSKEPTIC-INIT.md"), nextReadme, "utf8");
  }

  process.stdout.write(`Scaffolded AgentSkeptic layout in ${cwd}. See AGENTSKEPTIC-INIT.md\n`);
}
