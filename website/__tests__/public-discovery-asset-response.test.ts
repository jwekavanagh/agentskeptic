import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { existsSync } from "node:fs";
import {
  DISCOVERY_PUBLIC_FILE_NOT_FOUND_BODY,
  discoveryPublicFileResponse,
} from "@/lib/publicDiscoveryAssetResponse";

describe("publicDiscoveryAssetResponse", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
  });

  it("returns generic 404 body when the public file is missing (scanner-safe)", async () => {
    const res = discoveryPublicFileResponse("llms.txt", "text/plain; charset=utf-8");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe(DISCOVERY_PUBLIC_FILE_NOT_FOUND_BODY);
    expect(DISCOVERY_PUBLIC_FILE_NOT_FOUND_BODY).toBe("Not Found\n");
  });
});
