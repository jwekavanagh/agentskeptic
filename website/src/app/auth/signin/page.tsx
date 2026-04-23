import { getMeteringClarifier } from "@/lib/commercialNarrative";
import { Suspense } from "react";
import { SignInFormClient } from "./SignInFormClient";

const meteringClarifier = getMeteringClarifier();

export default function SignInPage() {
  return (
    <main>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SignInFormClient meteringClarifier={meteringClarifier} />
      </Suspense>
    </main>
  );
}
