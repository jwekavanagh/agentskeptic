import Link from "next/link";
import { productCopy } from "@/content/productCopy";

/** Contract §15: server-only markup above the client island; no children, no intro prop. */
export function AccountServerAboveFold({
  email,
  maskedKeySummary,
  showIntro,
}: {
  email: string;
  maskedKeySummary: string | null;
  showIntro: boolean;
}) {
  const intro = productCopy.accountPage;

  return (
    <>
      <p>
        Signed in as <strong>{email}</strong>
      </p>
      {maskedKeySummary !== null ? <p>API key: {maskedKeySummary}</p> : null}
      {showIntro ? (
        <>
          <p>{intro.line1}</p>
          <p className="muted">
            <Link href="/pricing">{intro.pricingLinkLabel}</Link>
            {" · "}
            <Link href="/integrate">{intro.integrateLinkLabel}</Link>
          </p>
        </>
      ) : null}
    </>
  );
}
