import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { atomicWriteUtf8File } from "../quickVerify/atomicWrite.js";
import { certificateCanonicalDigestHex } from "../certificateDigest.js";
import { materialTruthProjectionFromCertificate, materialTruthSha256 } from "../governanceEvidence.js";
import type { OutcomeCertificateV1 } from "../outcomeCertificate.js";
import { fingerprintUtf8JsonFileBytes, lineUtf8JsonFileBytes } from "./canonicalBytes.js";

const FIXTURE_B_PATH = join(
  __dirname,
  "..",
  "..",
  "test",
  "fixtures",
  "certificate-diff",
  "cases",
  "B.improved.after.json",
);

const CERT_SHA = "e881dd23b5997e60d5244f66fa2e92dced92f287adfafc5b11d6fefab04d83e7";
const MT_SHA = "7d76279aacf24151d0829db484104f13fe03d46deca2efd44747153535fe06db";

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

describe("canonicalBytes", () => {
  it("fingerprintUtf8JsonFileBytes emits sorted-keys JSON without trailing newline", () => {
    const obj = { b: 1, a: 2 };
    const buf = fingerprintUtf8JsonFileBytes(obj);
    expect(buf.toString("utf8")).toBe(`{"a":2,"b":1}`);
  });

  it("lineUtf8JsonFileBytes emits sorted-keys JSON with single trailing newline", () => {
    const obj = { b: 1, a: 2 };
    const buf = lineUtf8JsonFileBytes(obj);
    expect(buf.toString("utf8")).toBe(`{"a":2,"b":1}\n`);
  });

  it("disk bytes via atomicWriteUtf8File match the helper output (hash equality)", () => {
    const dir = mkdtempSync(join(tmpdir(), "canon-bytes-"));
    try {
      const obj = { workflowId: "wf_t", schemaVersion: 2, payload: { a: 1, z: 9 } };
      const helperBuf = lineUtf8JsonFileBytes(obj);
      const filePath = join(dir, "manifest.json");
      atomicWriteUtf8File(filePath, helperBuf.toString("utf8"));
      const diskBuf = readFileSync(filePath);
      expect(sha256Hex(diskBuf)).toBe(sha256Hex(helperBuf));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("B fixture: fingerprintUtf8JsonFileBytes(cert) hashes to CERT_SHA (governance parity)", () => {
    const cert = JSON.parse(readFileSync(FIXTURE_B_PATH, "utf8")) as OutcomeCertificateV1;
    const buf = fingerprintUtf8JsonFileBytes(cert);
    expect(sha256Hex(buf)).toBe(CERT_SHA);
    expect(certificateCanonicalDigestHex(cert)).toBe(CERT_SHA);
  });

  it("B fixture: fingerprintUtf8JsonFileBytes(materialTruthProjection) hashes to MT_SHA (governance parity)", () => {
    const cert = JSON.parse(readFileSync(FIXTURE_B_PATH, "utf8")) as OutcomeCertificateV1;
    const projection = materialTruthProjectionFromCertificate(cert);
    const buf = fingerprintUtf8JsonFileBytes(projection);
    expect(sha256Hex(buf)).toBe(MT_SHA);
    expect(materialTruthSha256(cert)).toBe(MT_SHA);
  });
});
