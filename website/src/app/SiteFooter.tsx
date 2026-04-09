import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <span className="site-footer-sep"> · </span>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
