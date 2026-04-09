"use client";

import { productCopy } from "@/content/productCopy";
import { emailSignInOptions } from "@/lib/sanitizeInternalCallbackUrl";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await signIn("email", emailSignInOptions(email, rawCallback));
    if (r?.error) {
      setMsg("Could not send sign-in email.");
    } else {
      setMsg("Check your email for the sign-in link.");
    }
  }

  return (
    <>
      <h1>{productCopy.signInPurpose.title}</h1>
      <p className="muted">{productCopy.signInPurpose.intro}</p>
      <ul className="signin-benefits">
        {productCopy.signInPurpose.benefits.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="card" style={{ maxWidth: "24rem", marginTop: "1rem" }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: "0.35rem",
            padding: "0.5rem",
            borderRadius: 8,
            border: "1px solid #38444d",
            background: "#0f1419",
            color: "var(--fg)",
          }}
        />
        <button type="submit" style={{ marginTop: "1rem" }}>
          Send magic link
        </button>
      </form>
      {msg && <p style={{ marginTop: "1rem" }}>{msg}</p>}
    </>
  );
}

export default function SignInPage() {
  return (
    <main>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
