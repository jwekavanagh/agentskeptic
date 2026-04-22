import { describe, expect, it } from "vitest";
import marketing from "@/lib/marketing";
import { visitorProblemFirstSentence } from "@/lib/visitorProblemFirstSentence";

describe("visitorProblemFirstSentence", () => {
  it("returns the first sentence of discovery visitorProblemAnswer", () => {
    const full = marketing.visitorProblemAnswer;
    const first = visitorProblemFirstSentence();
    expect(full.startsWith(first)).toBe(true);
    expect(first).toMatch(/[.!?]$/);
    expect(first.length).toBeLessThan(full.length);
  });
});
