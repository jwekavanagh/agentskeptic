import { describe, expect, it } from "vitest";
import { generateMetadata } from "@/app/guides/[slug]/page";

describe("LangGraph guide page metadata", () => {
  it("is indexable", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "verify-langgraph-workflows" }),
    });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });
});
