#!/usr/bin/env node
/**
 * Idempotently ensure one Stripe Product, flat recurring Prices (monthly + yearly for
 * Individual, Team, Business), and per-plan metered overage Prices (monthly usage,
 * $/verification with unit_amount_decimal for sub-cent precision).
 *
 * Prereq: `STRIPE_SECRET_KEY` in the environment.
 * Prints a block of `KEY=value` lines for Vercel / `.env` (all keys referenced in
 * `config/commercial-plans.json` schema v2).
 *
 * **Stripe model (operator):** Each self-serve subscription has two `line_items`:
 * (1) licensed recurring "base" — monthly or yearly interval, same Product;
 * (2) metered `usage_type: metered`, `interval: month` — billed on usage records.
 * The app maps `user.plan` from the **non-metered** line item’s Price id; see
 * `flatPriceIdFromSubscription` in `website/src/lib/priceIdToPlanId.ts`.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY required");
  process.exit(1);
}

const stripe = new Stripe(key);

const productName = "AgentSkeptic";
const CURRENCY = "usd";

const PLANS = [
  { id: "individual", baseMonthlyCents: 1900, baseYearlyCents: 18200, overageUsdStr: "0.015" },
  { id: "team", baseMonthlyCents: 7900, baseYearlyCents: 75800, overageUsdStr: "0.012" },
  { id: "business", baseMonthlyCents: 24900, baseYearlyCents: 239000, overageUsdStr: "0.009" },
];

async function product() {
  const products = await stripe.products.list({ limit: 20, active: true });
  let p = products.data.find((x) => x.name === productName);
  if (!p) {
    p = await stripe.products.create({ name: productName });
  }
  return p.id;
}

/**
 * @param {object} p
 * @param {string} p.nickname
 * @param {number} p.unitAmountCents - flat recurring monthly
 */
async function ensureRecurringPriceMonthly(
  productId,
  p,
) {
  const { nickname, unitAmountCents } = p;
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const found = prices.data.find(
    (x) =>
      x.nickname === nickname &&
      x.type === "recurring" &&
      x.recurring?.interval === "month" &&
      x.recurring?.usage_type === "licensed" &&
      x.unit_amount === unitAmountCents,
  );
  if (found) return found.id;
  return (
    await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      unit_amount: unitAmountCents,
      recurring: { interval: "month" },
      nickname,
    })
  ).id;
}

/**
 * @param {object} p
 * @param {string} p.nickname
 * @param {number} p.unitAmountCents
 */
async function ensureRecurringPriceYearly(
  productId,
  p,
) {
  const { nickname, unitAmountCents } = p;
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const found = prices.data.find(
    (x) =>
      x.nickname === nickname &&
      x.type === "recurring" &&
      x.recurring?.interval === "year" &&
      x.recurring?.usage_type === "licensed" &&
      x.unit_amount === unitAmountCents,
  );
  if (found) return found.id;
  return (
    await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      unit_amount: unitAmountCents,
      recurring: { interval: "year" },
      nickname,
    })
  ).id;
}

/**
 * @param {object} p
 * @param {string} p.nickname
 * @param {string} p.unitAmountDecimal - USD per verification (e.g. "0.015")
 */
async function ensureMeteredOveragePrice(
  productId,
  p,
) {
  const { nickname, unitAmountDecimal } = p;
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const found = prices.data.find(
    (x) =>
      x.nickname === nickname &&
      x.type === "recurring" &&
      x.recurring?.usage_type === "metered" &&
      x.recurring?.interval === "month" &&
      x.billing_scheme === "per_unit" &&
      (x.unit_amount_decimal || null) === unitAmountDecimal,
  );
  if (found) return found.id;
  return (
    await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      recurring: { interval: "month", usage_type: "metered" },
      unit_amount_decimal: unitAmountDecimal,
      billing_scheme: "per_unit",
      nickname,
    })
  ).id;
}

const pid = await product();
const out = [];
for (const x of PLANS) {
  const m = await ensureRecurringPriceMonthly(pid, {
    nickname: `${x.id}-v2-monthly`,
    unitAmountCents: x.baseMonthlyCents,
  });
  const y = await ensureRecurringPriceYearly(pid, {
    nickname: `${x.id}-v2-yearly`,
    unitAmountCents: x.baseYearlyCents,
  });
  const o = await ensureMeteredOveragePrice(pid, {
    nickname: `${x.id}-v2-overage-per-verif`,
    unitAmountDecimal: x.overageUsdStr,
  });
  const u = x.id.toUpperCase();
  out.push(`STRIPE_PRICE_${u}=${m}`);
  out.push(`STRIPE_PRICE_${u}_YEARLY=${y}`);
  out.push(`STRIPE_OVERAGE_${u}=${o}`);
}
console.log(out.join("\n"));
