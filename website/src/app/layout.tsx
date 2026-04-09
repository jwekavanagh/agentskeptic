import { siteMetadata } from "@/content/siteMetadata";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export const metadata: Metadata = {
  title: siteMetadata.title,
  description: siteMetadata.description,
  openGraph: {
    title: siteMetadata.openGraph.title,
    description: siteMetadata.openGraph.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <Providers>
          <div className="site-main">{children}</div>
        </Providers>
        <SiteFooter />
      </body>
    </html>
  );
}
