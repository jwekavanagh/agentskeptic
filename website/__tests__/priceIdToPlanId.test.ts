import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkoutStripePriceFromEnvKey,
  priceIdToPlanId,
  primarySubscriptionPriceId,
  stripePriceEnvCandidates,
} from "@/lib/priceIdToPlanId";

describe("priceIdToPlanId", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null for empty input", () => {
    expect(priceIdToPlanId(null)).toBeNull();
    expect(priceIdToPlanId(undefined)).toBeNull();
    expect(priceIdToPlanId("")).toBeNull();
  });

  it("trims the subscription price id before matching", () => {
    vi.stubEnv("STRIPE_PRICE_INDIVIDUAL", "price_ind_x");
    expect(priceIdToPlanId("  price_ind_x  ")).toBe("individual");
  });

  it("maps env-configured price ids to plan", () => {
    vi.stubEnv("STRIPE_PRICE_INDIVIDUAL", "price_ind_x");
    vi.stubEnv("STRIPE_PRICE_TEAM", "price_team_x");
    vi.stubEnv("STRIPE_PRICE_BUSINESS", "price_bus_x");
    expect(priceIdToPlanId("price_ind_x")).toBe("individual");
    expect(priceIdToPlanId("price_team_x")).toBe("team");
    expect(priceIdToPlanId("price_bus_x")).toBe("business");
  });

  it("returns null for unknown price id", () => {
    vi.stubEnv("STRIPE_PRICE_INDIVIDUAL", "price_ind_x");
    expect(priceIdToPlanId("price_unknown")).toBeNull();
  });

  it("maps any comma- or whitespace-separated env price id to the plan", () => {
    vi.stubEnv("STRIPE_PRICE_INDIVIDUAL", "price_new, price_legacy");
    expect(priceIdToPlanId("price_new")).toBe("individual");
    expect(priceIdToPlanId("price_legacy")).toBe("individual");
  });

  it("checkoutStripePriceFromEnvKey uses the first listed id", () => {
    vi.stubEnv("STRIPE_PRICE_INDIVIDUAL", "price_primary, price_alt");
    expect(checkoutStripePriceFromEnvKey("STRIPE_PRICE_INDIVIDUAL")).toBe("price_primary");
  });
});

describe("stripePriceEnvCandidates", () => {
  it("parses comma and whitespace lists", () => {
    expect(stripePriceEnvCandidates(" a , b  c ")).toEqual(["a", "b", "c"]);
  });

  it("returns empty for blank", () => {
    expect(stripePriceEnvCandidates("")).toEqual([]);
    expect(stripePriceEnvCandidates("  \t  ")).toEqual([]);
    expect(stripePriceEnvCandidates(null)).toEqual([]);
  });
});

describe("primarySubscriptionPriceId", () => {
  it("reads first item price id", () => {
    expect(
      primarySubscriptionPriceId({
        items: { data: [{ price: { id: "price_abc" } }] },
      }),
    ).toBe("price_abc");
  });

  it("handles expanded price as string", () => {
    expect(
      primarySubscriptionPriceId({
        items: { data: [{ price: "price_str" }] },
      }),
    ).toBe("price_str");
  });

  it("returns null when missing", () => {
    expect(primarySubscriptionPriceId({ items: { data: [] } })).toBeNull();
    expect(primarySubscriptionPriceId({})).toBeNull();
  });
});
