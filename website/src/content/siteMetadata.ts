import marketing from "@/lib/marketing";

export const siteMetadata = {
  integrate: marketing.site.integrate,
  openGraphImage: marketing.site.openGraph.image,
  security: marketing.site.security,
  support: marketing.site.support,
  claim: marketing.site.claim,
} as const;
