import { describe, expect, it } from "vitest";
import { subscriptionStatusFromStripe } from "@/lib/stripeSubscriptionStatus";

describe("subscriptionStatusFromStripe", () => {
  it("maps active and trialing to active", () => {
    expect(subscriptionStatusFromStripe("active")).toBe("active");
    expect(subscriptionStatusFromStripe("trialing")).toBe("active");
  });

  it("maps other Stripe statuses to inactive", () => {
    expect(subscriptionStatusFromStripe("canceled")).toBe("inactive");
    expect(subscriptionStatusFromStripe("unpaid")).toBe("inactive");
    expect(subscriptionStatusFromStripe("past_due")).toBe("inactive");
    expect(subscriptionStatusFromStripe("incomplete_expired")).toBe("inactive");
    expect(subscriptionStatusFromStripe("incomplete")).toBe("inactive");
    expect(subscriptionStatusFromStripe("paused")).toBe("inactive");
  });
});
