# Commercial entitlement policy

This document is the **hand-authored** source for **why** the product gates certain capabilities. Machine-readable entitlement rows live in [`config/commercial-entitlement-matrix.v1.json`](../config/commercial-entitlement-matrix.v1.json). The generated table is [`commercial-entitlement-matrix.md`](commercial-entitlement-matrix.md).

**Implementation SSOT (reserve bodies, codes, Stripe lifecycle, account `commercial-state`, deletion policy):** **[`docs/commercial-ssot.md`](commercial-ssot.md)** — section *Subscription state, Stripe webhooks, and account API*.

**Free vs paid capability matrix (OSS, commercial npm, Starter account):** **[`docs/commercial-ssot.md`](commercial-ssot.md)** — subsection *Free vs paid boundary (normative v1)*. Do not duplicate that matrix here.

The **OSS** default build does not expose **`enforce`** (exit **`ENFORCE_REQUIRES_COMMERCIAL_BUILD`**); entitlement rows below apply to **commercial** CLI builds. See **[`docs/commercial-enforce-gate-normative.md`](commercial-enforce-gate-normative.md)**.

## Why licensed `verify` is subscription-gated only on **paid** tiers

The **published npm** path is gated in **`POST /api/v1/usage/reserve`**. **Starter** accounts can **`verify`** up to the **free included** monthly allowance in config (`VERIFICATION` proceeds to quota; hard cap, no overage). **Individual / Team / Business / Enterprise** require an **active** Stripe-backed subscription (including **trialing**) for both **`verify`** and **`enforce`**, and paid tiers may continue past **included** into **metered overage** per plan. See [`docs/commercial-ssot.md`](commercial-ssot.md) for HTTP codes and `upgrade_url` behavior.

**OSS builds** from source (`WF_BUILD_PROFILE=oss`) do not call the license server and are not subscription-gated—see README and [`commercial-enforce-gate-normative.md`](commercial-enforce-gate-normative.md).

## Why `enforce` and CI locks share the same paid gate

**Licensed `verify` / `quick` with `--output-lock`** uses **`intent=verify`** on reserve. **`--expect-lock`**, **`agentskeptic enforce`**, and other enforcement-shaped paths use **`intent=enforce`**, which requires a **paid** plan (not Starter) and an active subscription (SSOT; see [`commercial-enforce-gate-normative.md`](commercial-enforce-gate-normative.md)).

## Why `starter` can `verify` but not `enforce` on commercial npm

**Starter** is the **free** commercial tier: licensed **`verify`** is allowed up to the monthly **included** cap in [`config/commercial-plans.json`](../config/commercial-plans.json). **`enforce`** returns **`ENFORCEMENT_REQUIRES_PAID_PLAN`** with an **`upgrade_url`**.

## `RESERVE_EMERGENCY_ALLOW`

When `RESERVE_EMERGENCY_ALLOW=1` on the server, the **subscription check for paid-plan `verify` and `enforce`** is waived (operations break-glass). **Starter `enforce` remains denied** (paid-only). **Starter `verify`** is not subscription-gated. **Quota and idempotency still apply**—emergency does not bypass monthly limits.

## Pricing surface (normative user-visible lines)

The `/pricing` page must show the following two lines **verbatim** (drift is caught by `test/commercial-pricing-policy-parity.test.mjs` and Playwright).

<!-- commercial-pricing-lines-begin -->
Starter includes 1,000 published npm CLI verifications per month (hard cap, no overage). Individual, Team, and Business include higher monthly amounts plus pay-as-you-go overage; an active subscription is required (trial counts).
CI locks, the enforce command, and quick verify with lock flags require a paid plan (not Starter) and the same active subscription and metering model.
<!-- commercial-pricing-lines-end -->
