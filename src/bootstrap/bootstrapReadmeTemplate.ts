/** Fixed template for README.bootstrap.md (workflowId substituted). */
export function buildBootstrapReadmeMarkdown(workflowId: string): string {
  return `# Bootstrap pack (generated)

This directory was produced by \`agentskeptic bootstrap\`.

\`quick-report.json\` is a full Quick Verify report and remains **provisional** (see \`productTruth\` in that JSON). For contract verification against the same database you used for bootstrap:

\`\`\`bash
agentskeptic verify --workflow-id ${workflowId} --events ./events.ndjson --registry ./tools.json --db <path-to-same-sqlite.db>
\`\`\`

Use \`--postgres-url\` instead of \`--db\` when verifying against Postgres.

`;
}
