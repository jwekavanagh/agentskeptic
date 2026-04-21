import { publicProductAnchors } from "./publicProductAnchors";

export function indexableGuideCanonical(path: string): string {
  const origin = publicProductAnchors.productionCanonicalOrigin.replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function indexableExampleCanonical(path: string): string {
  return indexableGuideCanonical(path);
}
