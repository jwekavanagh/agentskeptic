import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { apiKeysV2 } from "@/db/schema";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const updated = await db
    .update(apiKeysV2)
    .set({ revokedAt: new Date(), status: "revoked" })
    .where(and(eq(apiKeysV2.userId, session.user.id), eq(apiKeysV2.status, "active")))
    .returning({ id: apiKeysV2.id });

  return NextResponse.json({
    ok: true as const,
    revoked: updated.length >= 1,
  });
}
