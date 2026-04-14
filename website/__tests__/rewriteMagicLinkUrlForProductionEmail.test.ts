import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  rewriteMagicLinkUrlForProductionEmail,
} from "@/lib/canonicalSiteOrigin";

describe("rewriteMagicLinkUrlForProductionEmail", () => {
  const origVercelEnv = process.env.VERCEL_ENV;
  const origPublicUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (origVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = origVercelEnv;
    if (origPublicUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = origPublicUrl;
  });

  it("returns the URL unchanged when not production-like", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://agentskeptic.com";
    const url =
      "https://agentskeptic-git-main-x.vercel.app/api/auth/callback/email?token=t&email=a%40b.co";
    expect(rewriteMagicLinkUrlForProductionEmail(url)).toBe(url);
  });

  it("rewrites origin to canonical when VERCEL_ENV is production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://agentskeptic.com";
    const url =
      "https://agentskeptic-git-main-x.vercel.app/api/auth/callback/email?token=t&email=a%40b.co";
    expect(rewriteMagicLinkUrlForProductionEmail(url)).toBe(
      "https://agentskeptic.com/api/auth/callback/email?token=t&email=a%40b.co",
    );
  });

  it("does not rewrite when origin already matches canonical", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://agentskeptic.com";
    const url =
      "https://agentskeptic.com/api/auth/callback/email?token=t&email=a%40b.co";
    expect(rewriteMagicLinkUrlForProductionEmail(url)).toBe(url);
  });

  it("returns original string when URL parse fails", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://agentskeptic.com";
    expect(rewriteMagicLinkUrlForProductionEmail("not-a-url")).toBe("not-a-url");
  });
});
