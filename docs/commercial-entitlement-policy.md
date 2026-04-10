# Commercial entitlement policy

This document is the **hand-authored** source for **why** the product gates certain capabilities. Machine-readable entitlement rows live in [`config/commercial-entitlement-matrix.v1.json`](../config/commercial-entitlement-matrix.v1.json). The generated table is [`commercial-entitlement-matrix.md`](commercial-entitlement-matrix.md).

## Why `verify` is never subscription-gated

Batch and quick **verification** (`intent=verify` on the license reserve API) only consumes **monthly quota**. Users can **understand and debug** workflows after churn or before subscribing, as long as they stay within plan limits. Subscription status (`none`, `inactive`, `active`) does **not** block verification.

## Why `enforce` is the paid gate

**Enforcement** (`workflow-verifier enforce …`, `intent=enforce`) is how verification becomes a **CI/CD or deployment gate**. That “depend on correctness” use is the qualitative upgrade: it requires a **paid plan** (`team`, `business`, or `enterprise`) with an **active** Stripe-backed subscription (or emergency override—see below).

## Why `starter` cannot `enforce`

The **starter** plan is for evaluation and debugging. It never includes **enforce** entitlement; attempts return `ENFORCEMENT_REQUIRES_PAID_PLAN` with an upgrade URL.

## `RESERVE_EMERGENCY_ALLOW`

When `RESERVE_EMERGENCY_ALLOW=1` on the server, the **subscription check for paid-plan `enforce` only** is waived (operations break-glass). **Starter `enforce` remains denied.** **Quota and idempotency still apply**—emergency does not bypass monthly limits.

## Pricing surface (normative user-visible lines)

The `/pricing` page must show the following two lines **verbatim** (drift is caught by `test/commercial-pricing-policy-parity.test.mjs` and Playwright).

<!-- commercial-pricing-lines-begin -->
Verification uses your monthly API quota and is not blocked by subscription status.
CI and deployment enforcement (the enforce command) requires Team or Business with an active paid subscription.
<!-- commercial-pricing-lines-end -->
