import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type DiscoveryPublicFile = "llms.txt" | "openapi-commercial-v1.yaml";

/** Generic 404 copy — avoids scanner “application error disclosure” on operational sync hints. */
export const DISCOVERY_PUBLIC_FILE_NOT_FOUND_BODY = "Not Found\n";

/**
 * Serves a generated file from `website/public/` without `Access-Control-Allow-Origin: *`.
 * Static hosting on Vercel adds a wildcard ACAO for `public/` assets, which triggers ZAP 10098
 * (Cross-Domain Misconfiguration). App routes take precedence over the same path in `public/`.
 */
export function discoveryPublicFileResponse(fileName: DiscoveryPublicFile, contentType: string): NextResponse {
  const filePath = path.join(process.cwd(), "public", fileName);
  if (!existsSync(filePath)) {
    return new NextResponse(DISCOVERY_PUBLIC_FILE_NOT_FOUND_BODY, {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const body = readFileSync(filePath, "utf8");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
