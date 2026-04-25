import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { revokeApiKeyForUser } from "@/lib/apiKeyLifecycle";
import { logFunnelEvent } from "@/lib/funnelEvent";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const out = await revokeApiKeyForUser(session.user.id, id);
  if (out.revoked) {
    await logFunnelEvent({
      event: "api_key_revoked",
      userId: session.user.id,
      metadata: { key_id: id },
    });
  }
  return NextResponse.json({ ok: true as const, revoked: out.revoked });
}
