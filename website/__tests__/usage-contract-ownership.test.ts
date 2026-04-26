import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("usage contract ownership", () => {
  it("keeps UsageCurrentV1 schema in a single contract file", () => {
    const contract = read("lib/contracts/usageCurrent.ts");
    expect(contract).toContain("schema_version: z.literal(1)");
    const usageSnapshot = read("lib/usageSnapshot.ts");
    const usageRoute = read("app/api/v1/usage/current/route.ts");
    expect(usageSnapshot).not.toContain("z.literal(1)");
    expect(usageRoute).not.toContain("schema_version:");
  });

  it("enforces architecture import boundaries", () => {
    const reserveRoute = read("app/api/v1/usage/reserve/route.ts");
    const usageRoute = read("app/api/v1/usage/current/route.ts");
    const overage = read("app/api/internal/usage/overage-reconcile/route.ts");
    const accountState = read("lib/commercialAccountState.ts");
    expect(reserveRoute).toContain('from "@/lib/quotaPolicy"');
    expect(reserveRoute).not.toContain('from "@/lib/usageSnapshot"');
    expect(usageRoute).toContain('from "@/lib/usageSnapshot"');
    expect(overage).toContain('from "@/lib/usageSnapshot"');
    expect(accountState).toContain('from "@/lib/usageSnapshot"');
  });
});

