import {
  createPrivateKey,
  createPublicKey,
  sign,
  type KeyObject,
} from "node:crypto";
import { BUNDLE_SIGNATURE_PRIVATE_KEY_INVALID } from "./bundleSignatureCodes.js";
import { lfCanonicalUtf8Payload, sha256Hex } from "./agentRunRecord.js";
import { TruthLayerError } from "./truthLayerError.js";
import { normalizeSpkiPemForSidecar } from "./workflowResultSignaturePemNormalize.js";

function loadEd25519PrivateKeyFromPkcs8Pem(pemUtf8: string): KeyObject {
  try {
    return createPrivateKey({ key: pemUtf8, format: "pem", type: "pkcs8" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TruthLayerError(BUNDLE_SIGNATURE_PRIVATE_KEY_INVALID, msg, { cause: e });
  }
}

/**
 * Shared Ed25519 signer used by workflow-result and decision-bundle manifest sidecars.
 *
 * Canonicalises the payload bytes (LF-only EOL), signs with the supplied PKCS#8 PEM private key,
 * and emits a sidecar JSON object with fixed key order:
 * algorithm, schemaVersion, signatureBase64, signedContentSha256Hex, signingPublicKeySpkiPem.
 * Buffer ends with a single trailing newline.
 */
export function signCanonicalBytesEd25519(payload: Buffer, pkcs8PemUtf8: string): Buffer {
  const privateKey = loadEd25519PrivateKeyFromPkcs8Pem(pkcs8PemUtf8);
  const publicKey = createPublicKey(privateKey);
  const spkiPemRaw = publicKey.export({ type: "spki", format: "pem" });
  if (typeof spkiPemRaw !== "string") {
    throw new TruthLayerError(BUNDLE_SIGNATURE_PRIVATE_KEY_INVALID, "Expected PEM string export");
  }
  const signingPublicKeySpkiPem = normalizeSpkiPemForSidecar(spkiPemRaw);

  const canonical = lfCanonicalUtf8Payload(payload);
  const sigBuf = sign(null, canonical, privateKey);
  const signedContentSha256Hex = sha256Hex(canonical);

  const sidecar = {
    algorithm: "ed25519",
    schemaVersion: 1,
    signatureBase64: sigBuf.toString("base64"),
    signedContentSha256Hex,
    signingPublicKeySpkiPem,
  };

  return Buffer.from(`${JSON.stringify(sidecar)}\n`, "utf8");
}
