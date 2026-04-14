import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountLicensedStepsList } from "@/components/account/AccountLicensedStepsList";
import { AccountClient } from "./AccountClient";
import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { assembleCommercialAccountState } from "@/lib/commercialAccountState";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=%2Faccount");
  }

  const keys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, session.user.id), isNull(apiKeys.revokedAt)));

  const initialCommercial = await assembleCommercialAccountState({
    userId: session.user.id,
    expectedPlan: null,
    operatorContactEmail: process.env.CONTACT_SALES_EMAIL,
  });

  const masked = keys[0] ? `wf_sk_live_****… (created)` : null;

  return (
    <main>
      <h1>Account</h1>
      <div className="card" style={{ marginTop: "1rem" }}>
        <p>
          Signed in as <strong>{session.user.email}</strong>
        </p>
        {masked && <p>API key: {masked}</p>}
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Licensed verification</h2>
        <AccountLicensedStepsList />
      </div>
      <Suspense fallback={<div className="card" style={{ marginTop: "1rem" }}>Loading…</div>}>
        <AccountClient hasKey={keys.length > 0} initialCommercial={initialCommercial} />
      </Suspense>
    </main>
  );
}
