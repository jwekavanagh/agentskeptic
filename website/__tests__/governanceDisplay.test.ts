import { describe, expect, it } from "vitest";
import { relianceClassFromRunKind } from "@/lib/governanceDisplay";

describe("relianceClassFromRunKind", () => {
  it("maps quick_preview to provisional", () => {
    expect(relianceClassFromRunKind("quick_preview")).toBe("provisional");
  });

  it("maps contract_sql to eligible", () => {
    expect(relianceClassFromRunKind("contract_sql")).toBe("eligible");
  });

  it("defaults unknown run kinds to eligible", () => {
    expect(relianceClassFromRunKind(undefined)).toBe("eligible");
    expect(relianceClassFromRunKind("")).toBe("eligible");
    expect(relianceClassFromRunKind("other")).toBe("eligible");
  });
});
