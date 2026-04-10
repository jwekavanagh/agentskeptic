import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { siteMetadata } from "@/content/siteMetadata";
import { embeddedFirstRunIntegrationMd } from "@/generated/integratorDocsEmbedded";
import type { Metadata } from "next";
import { FirstRunActivationGuide } from "./FirstRunActivationGuide";

export const metadata: Metadata = {
  title: siteMetadata.integrate.title,
  description: siteMetadata.integrate.description,
};

export default function IntegratePage() {
  const md = embeddedFirstRunIntegrationMd;
  return (
    <main className="integrate-main">
      <FirstRunActivationGuide />
      <h2 className="integrate-full-doc-heading">Full integration guide (prose SSOT)</h2>
      <article className="integrate-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </article>
    </main>
  );
}
