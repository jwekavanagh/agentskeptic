import { describe, expect, it } from "vitest";
import { loadSchemaValidator } from "agentskeptic/schemaLoad";
import minimalEnvelope from "@/content/embeddedReports/minimal-share-v3-envelope.json";
import trustedEnvelope from "@/content/embeddedReports/minimal-share-v3-trusted.json";
import unknownEnvelope from "@/content/embeddedReports/minimal-share-v3-unknown.json";

describe("embedded share envelopes validate as public-verification-report-v3", () => {
  const v = loadSchemaValidator("public-verification-report-v3");

  it("minimal-share-v3-envelope", () => {
    expect(v(minimalEnvelope)).toBe(true);
  });

  it("minimal-share-v3-trusted", () => {
    expect(v(trustedEnvelope)).toBe(true);
  });

  it("minimal-share-v3-unknown", () => {
    expect(v(unknownEnvelope)).toBe(true);
  });
});
