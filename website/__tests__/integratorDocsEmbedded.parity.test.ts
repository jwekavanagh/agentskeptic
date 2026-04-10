import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  embeddedFirstRunIntegrationMd,
  embeddedPartnerQuickstartCommandsMd,
} from "@/generated/integratorDocsEmbedded";

const repoRoot = path.resolve(__dirname, "..", "..");

describe("integratorDocsEmbedded parity vs docs SSOT", () => {
  it("embeddedFirstRunIntegrationMd matches docs/first-run-integration.md", () => {
    const disk = readFileSync(path.join(repoRoot, "docs", "first-run-integration.md"), "utf8");
    expect(embeddedFirstRunIntegrationMd).toBe(disk);
  });

  it("embeddedPartnerQuickstartCommandsMd matches docs/partner-quickstart-commands.md", () => {
    const disk = readFileSync(path.join(repoRoot, "docs", "partner-quickstart-commands.md"), "utf8");
    expect(embeddedPartnerQuickstartCommandsMd).toBe(disk);
  });
});
