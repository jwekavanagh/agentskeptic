import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EPISTEMIC_CONTRACT_INTEGRATOR_SNIPPET } from "@/generated/epistemicContractIntegrator";
import { extractIntegratorSnippetFromBody } from "../../scripts/lib/readEpistemicContractFence.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

describe("epistemicContractIntegrator parity", () => {
  it("generated export matches docs/epistemic-contract.md integrator fence", () => {
    const md = readFileSync(join(repoRoot, "docs", "epistemic-contract.md"), "utf8");
    const fromDoc = extractIntegratorSnippetFromBody(md);
    expect(EPISTEMIC_CONTRACT_INTEGRATOR_SNIPPET).toBe(fromDoc);
  });
});
