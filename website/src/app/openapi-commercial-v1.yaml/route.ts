import { discoveryPublicFileResponse } from "@/lib/publicDiscoveryAssetResponse";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return discoveryPublicFileResponse("openapi-commercial-v1.yaml", "application/yaml; charset=utf-8");
}
