import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Update in the same commit as `website/public/brand/mark.png` changes. */
const MARK_PNG_SHA256 = "744155f71d0a59159786425813e1097aec2bb72ac663f9f3ffa45f2ea2440f91";

/** Update in the same commit as `website/public/og.png` changes. */
const OG_PNG_SHA256 = "94f33be81b76543ecfa7791ee0139b63304d4b36a21144595292ce617aa5f858";

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function readPngIhdrDimensions(buf: Buffer): { width: number; height: number } {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error("not a PNG");
  }
  if (buf.readUInt32BE(12) !== 0x49484452) {
    throw new Error("missing IHDR");
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("rebrand assets (pinned bytes)", () => {
  const webRoot = path.join(__dirname, "..");
  const markPath = path.join(webRoot, "public", "brand", "mark.png");
  const ogPath = path.join(webRoot, "public", "og.png");

  it("mark.png SHA-256 matches pin and IHDR is square", () => {
    const buf = readFileSync(markPath);
    expect(sha256Hex(buf)).toBe(MARK_PNG_SHA256);
    const { width, height } = readPngIhdrDimensions(buf);
    expect(width).toBe(height);
    expect(width).toBeGreaterThanOrEqual(32);
  });

  it("og.png SHA-256 matches pin and IHDR is 1200×630", () => {
    const buf = readFileSync(ogPath);
    expect(sha256Hex(buf)).toBe(OG_PNG_SHA256);
    const { width, height } = readPngIhdrDimensions(buf);
    expect(width).toBe(1200);
    expect(height).toBe(630);
  });
});
