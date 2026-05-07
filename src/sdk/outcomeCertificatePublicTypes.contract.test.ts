import { describe, expect, it } from "vitest";
import type { OutcomeCertificateV1, OutcomeCertificateV3 } from "../outcomeCertificate.js";

describe("OutcomeCertificateV1 / OutcomeCertificateV3 public alias parity", () => {
  it("is bidirectionally assignable (same TypeScript type)", () => {
    const _asLegacyName: OutcomeCertificateV1 = {} as OutcomeCertificateV3;
    const _asCurrentName: OutcomeCertificateV3 = {} as OutcomeCertificateV1;
    expect(_asLegacyName).toBeDefined();
    expect(_asCurrentName).toBeDefined();
  });

  it("lets OutcomeCertificateV3 satisfy parameters typed OutcomeCertificateV1", () => {
    function legacyParam(_cert: OutcomeCertificateV1) {}
    const fromModernSurface: OutcomeCertificateV3 = {} as OutcomeCertificateV3;
    legacyParam(fromModernSurface);
    expect(true).toBe(true);
  });
});
