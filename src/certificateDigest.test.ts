import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { OutcomeCertificateV1 } from "./outcomeCertificate.js";
import { certificateCanonicalDigestHex } from "./certificateDigest.js";
import { stringifyWithSortedKeys } from "./sortedJsonStringify.js";

describe("certificateCanonicalDigestHex", () => {
  it("equals sha256(utf8 stringified sorted-keys JSON); order of keys in object literal does not matter", () => {
    const a = { z: 1, m: 2 } as unknown as OutcomeCertificateV1;
    const b = { m: 2, z: 1 } as unknown as OutcomeCertificateV1;
    const want = createHash("sha256").update(stringifyWithSortedKeys(a), "utf8").digest("hex");
    expect(certificateCanonicalDigestHex(a)).toBe(want);
    expect(certificateCanonicalDigestHex(b)).toBe(want);
  });
});
