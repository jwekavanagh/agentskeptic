#!/usr/bin/env node
/**
 * Deterministic bootstrap for test/fixtures/decision-bundle-integrity/**.
 *
 * NEVER:
 *   - generates Ed25519 keys (test-priv/pub PEMs are committed literals).
 *   - touches legacy-v1/ (committed exact bytes).
 *   - touches expected/ (hand-derived goldens are committed verbatim).
 *
 * ALWAYS:
 *   - writes B-fixture-derived bytes for the v2 case bundles.
 *   - asserts every sha256 against §Frozen constants + computed example-sidecar values.
 *   - re-runs as a no-op when fixtures already match.
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1"), "..");
const FIXTURE_ROOT = path.join(ROOT, "test", "fixtures", "decision-bundle-integrity");
const KEYS_DIR = path.join(FIXTURE_ROOT, "keys");

const TEST_PRIV_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIAIWJshyZxljkng4poklUjEAbxBI+9QxmB8WqHmh+JIl
-----END PRIVATE KEY-----
`;
const TEST_PUB_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAyMaQhpD9Z3wsx69gJ3bMu3yeu3rFpK6ZdAEJNwVffME=
-----END PUBLIC KEY-----
`;
const TEST_PUB_WRONG_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA3E8zh8fZAtdw/HmXSJ2+hguP9bWTglOW031XbH7Nk5A=
-----END PUBLIC KEY-----
`;

const CERT_SHA = "e881dd23b5997e60d5244f66fa2e92dced92f287adfafc5b11d6fefab04d83e7";
const MT_SHA = "7d76279aacf24151d0829db484104f13fe03d46deca2efd44747153535fe06db";
const MAN_SHA = "87ea78801cab61aa0d3fd0751098df0768d6af28f9e0699a43c8d5008b885509";

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, "en"));
  const out = {};
  for (const k of keys) out[k] = canonicalize(obj[k]);
  return out;
}

function fingerprintUtf8(obj) {
  return Buffer.from(JSON.stringify(canonicalize(obj)), "utf8");
}

function lineUtf8(obj) {
  return Buffer.from(`${JSON.stringify(canonicalize(obj))}\n`, "utf8");
}

function assertSha(buf, expected, label) {
  const actual = sha256Hex(buf);
  if (actual !== expected) {
    throw new Error(`sha256 mismatch for ${label}: actual=${actual} expected=${expected}`);
  }
}

function writeFile(relPath, contents) {
  const abs = path.join(FIXTURE_ROOT, relPath);
  mkdirSync(path.dirname(abs), { recursive: true });
  const buf = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, "utf8");
  if (existsSync(abs)) {
    const current = readFileSync(abs);
    if (current.equals(buf)) return false;
  }
  writeFileSync(abs, buf);
  return true;
}

function copyFile(srcRel, dstRel) {
  const buf = readFileSync(path.join(FIXTURE_ROOT, srcRel));
  return writeFile(dstRel, buf);
}

function ensureKeyFile(relPath, expected) {
  const abs = path.join(FIXTURE_ROOT, relPath);
  if (existsSync(abs)) {
    const current = readFileSync(abs, "utf8");
    if (current === expected) return false;
  }
  return writeFile(relPath, expected);
}

// --- Step 1: keys (literal bytes; never generated).
mkdirSync(KEYS_DIR, { recursive: true });
const wroteKeyPriv = ensureKeyFile("keys/test-priv.pem", TEST_PRIV_PEM);
const wroteKeyPub = ensureKeyFile("keys/test-pub.pem", TEST_PUB_PEM);
const wroteKeyWrong = ensureKeyFile("keys/test-pub-wrong.pem", TEST_PUB_WRONG_PEM);

// --- Step 2: derive B-fixture certificate + material-truth projection bytes.
const certPath = path.join(ROOT, "test", "fixtures", "certificate-diff", "cases", "B.improved.after.json");
const certificate = JSON.parse(readFileSync(certPath, "utf8"));
const certBytes = fingerprintUtf8(certificate);
assertSha(certBytes, CERT_SHA, "B.improved.after.json (canonical sorted JSON)");

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
const materialTruth = {
  schemaVersion: 2,
  workflowId: certificate.workflowId,
  runKind: certificate.runKind,
  stateRelation: certificate.stateRelation,
  reasonCodes: sortedUnique(certificate.explanation.details.map((d) => d.code)),
  evidenceGapPrimary: certificate.evidenceCompleteness.blockerCategory,
  steps: [...certificate.steps]
    .map((s) => ({
      seq: s.seq,
      toolId: s.toolId ?? "",
      declaredAction: s.declaredAction,
      expectedOutcome: s.expectedOutcome,
      observedOutcome: s.observedOutcome,
    }))
    .sort((a, b) => a.seq - b.seq || a.toolId.localeCompare(b.toolId)),
  checkpointVerdicts: [...(certificate.checkpointVerdicts ?? [])]
    .map((v) => ({
      checkpointKey: v.checkpointKey,
      verdict: v.verdict,
      seqs: [...new Set(v.seqs)].sort((a, b) => a - b),
    }))
    .sort((a, b) => a.checkpointKey.localeCompare(b.checkpointKey)),
};
const mtBytes = fingerprintUtf8(materialTruth);
assertSha(mtBytes, MT_SHA, "material-truth projection (canonical sorted JSON)");

const manifest = {
  bundleKind: "decision_evidence",
  certificate: { relativePath: "outcome-certificate.json", sha256: CERT_SHA },
  completeness: {
    artifacts: { a4Present: false, a5Present: false, a5Required: false },
    status: "complete",
  },
  createdAt: "2026-05-13T00:00:00.000Z",
  materialTruth: {
    relativePath: "material-truth.json",
    schemaVersion: 2,
    sha256: MT_SHA,
  },
  producer: { name: "agentskeptic", version: "TEST" },
  schemaVersion: 2,
  workflowId: "wf_fixture_diff",
};
const manifestBytes = lineUtf8(manifest);
assertSha(manifestBytes, MAN_SHA, "valid-unsigned/manifest.json (canonical sorted JSON + \\n)");

const exitBytes = Buffer.from(
  `${JSON.stringify({ schemaVersion: 1, exitCode: 0, cliConvention: "outcome_certificate_v2" })}\n`,
  "utf8",
);
const humanLayerBytes = Buffer.from(
  `${JSON.stringify({ schemaVersion: 1, kind: "report", text: "fixture B after human." })}\n`,
  "utf8",
);

// --- Step 3: valid-unsigned/
let touched = false;
function write(rel, buf) {
  if (writeFile(rel, buf)) touched = true;
}
write("valid-unsigned/outcome-certificate.json", certBytes);
write("valid-unsigned/material-truth.json", mtBytes);
write("valid-unsigned/exit.json", exitBytes);
write("valid-unsigned/human-layer.json", humanLayerBytes);
write("valid-unsigned/manifest.json", manifestBytes);

// --- Step 4: valid-signed/ — copy valid-unsigned and append manifest.sig.json.
for (const name of ["outcome-certificate.json", "material-truth.json", "exit.json", "human-layer.json", "manifest.json"]) {
  if (copyFile(`valid-unsigned/${name}`, `valid-signed/${name}`)) touched = true;
}

const privKey = createPrivateKey({ key: TEST_PRIV_PEM, format: "pem", type: "pkcs8" });
const sigBuf = sign(null, manifestBytes, privKey);
const sidecarObj = {
  algorithm: "ed25519",
  schemaVersion: 1,
  signatureBase64: sigBuf.toString("base64"),
  signedContentSha256Hex: MAN_SHA,
  signingPublicKeySpkiPem: TEST_PUB_PEM,
};
const sidecarBytes = Buffer.from(`${JSON.stringify(sidecarObj)}\n`, "utf8");
write("valid-signed/manifest.sig.json", sidecarBytes);

// --- Step 5: tampered-certificate/, tampered-material-truth/, missing-material-truth/
function copyDir(src, dst, files) {
  for (const f of files) {
    if (copyFile(`${src}/${f}`, `${dst}/${f}`)) touched = true;
  }
}
const signedFiles = ["outcome-certificate.json", "material-truth.json", "exit.json", "human-layer.json", "manifest.json", "manifest.sig.json"];

// Deterministic mutation for tampered cases: drop the final byte of the target file.
const tcFiles = signedFiles.filter((f) => f !== "outcome-certificate.json");
copyDir("valid-signed", "tampered-certificate", tcFiles);
const tcSlice = certBytes.subarray(0, certBytes.length - 1);
write("tampered-certificate/outcome-certificate.json", tcSlice);

const tmFiles = signedFiles.filter((f) => f !== "material-truth.json");
copyDir("valid-signed", "tampered-material-truth", tmFiles);
const tmSlice = mtBytes.subarray(0, mtBytes.length - 1);
write("tampered-material-truth/material-truth.json", tmSlice);

const missingMtFiles = signedFiles.filter((f) => f !== "material-truth.json");
copyDir("valid-signed", "missing-material-truth", missingMtFiles);
const missingMt = path.join(FIXTURE_ROOT, "missing-material-truth/material-truth.json");
if (existsSync(missingMt)) {
  rmSync(missingMt);
  touched = true;
}

// --- Step 6: manifest-broken-json/
write("manifest-broken-json/outcome-certificate.json", certBytes);
write("manifest-broken-json/material-truth.json", mtBytes);
write("manifest-broken-json/exit.json", exitBytes);
write("manifest-broken-json/human-layer.json", humanLayerBytes);
write("manifest-broken-json/manifest.json", Buffer.from("{\n", "utf8"));

// --- Step 7: manifest-extra-key/
const manifestExtra = {
  bundleKind: "decision_evidence",
  certificate: { relativePath: "outcome-certificate.json", sha256: CERT_SHA },
  completeness: {
    artifacts: { a4Present: false, a5Present: false, a5Required: false },
    status: "complete",
  },
  createdAt: "2026-05-13T00:00:00.000Z",
  materialTruth: {
    relativePath: "material-truth.json",
    schemaVersion: 2,
    sha256: MT_SHA,
  },
  producer: { name: "agentskeptic", version: "TEST" },
  schemaVersion: 2,
  unexpectedKey: "reject_me",
  workflowId: "wf_fixture_diff",
};
const manifestExtraBytes = lineUtf8(manifestExtra);
write("manifest-extra-key/outcome-certificate.json", certBytes);
write("manifest-extra-key/material-truth.json", mtBytes);
write("manifest-extra-key/exit.json", exitBytes);
write("manifest-extra-key/human-layer.json", humanLayerBytes);
write("manifest-extra-key/manifest.json", manifestExtraBytes);

// --- Step 8: example-sidecar/ — minimal sidecar verification fixture.
const exampleManifest = {
  bundleKind: "decision_evidence",
  certificate: { relativePath: "outcome-certificate.json", sha256: "0".repeat(64) },
  completeness: {
    artifacts: { a4Present: false, a5Present: false, a5Required: false },
    status: "complete",
  },
  createdAt: "2026-05-13T12:00:00.000Z",
  materialTruth: { relativePath: "material-truth.json", schemaVersion: 2, sha256: "f".repeat(64) },
  producer: { name: "example_sidecar", version: "0" },
  schemaVersion: 2,
  workflowId: "wf_example_sidecar",
};
const exampleManifestBytes = lineUtf8(exampleManifest);
const exampleManifestSha = sha256Hex(exampleManifestBytes);

const exampleSigBuf = sign(null, exampleManifestBytes, privKey);
const examplePubKey = createPublicKey({ key: TEST_PUB_PEM, format: "pem" });
const verifyOk = verify(null, exampleManifestBytes, examplePubKey, exampleSigBuf);
if (!verifyOk) throw new Error("example-sidecar verify failed");

const exampleSidecarObj = {
  algorithm: "ed25519",
  schemaVersion: 1,
  signatureBase64: exampleSigBuf.toString("base64"),
  signedContentSha256Hex: exampleManifestSha,
  signingPublicKeySpkiPem: TEST_PUB_PEM,
};
const exampleSidecarBytes = Buffer.from(`${JSON.stringify(exampleSidecarObj)}\n`, "utf8");
write("example-sidecar/manifest.json", exampleManifestBytes);
write("example-sidecar/manifest.sig.json", exampleSidecarBytes);

// --- Summary
const summary = {
  keysTouched: wroteKeyPriv || wroteKeyPub || wroteKeyWrong,
  fixturesTouched: touched,
  shas: {
    cert: CERT_SHA,
    materialTruth: MT_SHA,
    manifest: MAN_SHA,
    exampleManifest: exampleManifestSha,
  },
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
