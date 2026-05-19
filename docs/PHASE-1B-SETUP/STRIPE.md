# Stripe setup — subscriptions

Phase 1B step 3. The application code is wired and gated on env vars —
nothing in this guide touches code. All work is in the Stripe dashboard
and the Render dashboard.

**Prerequisites:** complete SendGrid setup ([SENDGRID.md](./SENDGRID.md))
and Custom Domain ([CUSTOM-DOMAIN.md](./CUSTOM-DOMAIN.md)) first so the
webhook URL is stable at `https://invoices.aisolutionsbb.com/api/stripe/webhook`.

## 1. Activate the Stripe account (15 min, only if not already done)

1. https://stripe.com → sign up with `jamai@aisolutionsbb.com`.
2. **Activate live payments** — Stripe asks for: business name (AI
   Solutions Barbados), registered address, tax ID, bank account for
   payouts, and a website (the marketing site or the staging URL is
   fine). Approval is usually instant for Barbados; can take 1 day if
   they flag anything.
3. Set the dashboard to **live mode** (toggle top-left). Everything
   below assumes live mode unless noted.

> Working in test mode first? Same steps, just toggle to test mode and
> use `sk_test_...` / `whsec_...` test values. The code paths are
> identical.

## 2. Create the three products (10 min)

For each tier — Starter, Growth, Pro — in the Stripe dashboard:

1. **Products** → **Add product**.
2. **Name:** `AISB Invoicer — Starter` (then Growth, then Pro).
3. **Pricing model:** Recurring.
4. **Price:** 29.00 / 59.00 / 99.00.
5. **Currency:** `BBD` (Barbadian Dollar). If BBD isn't in the dropdown,
   Stripe needs to enable it for your account — open support, takes
   ~1 business day. As a temporary workaround you can launch in USD at
   the same numbers; the schema stores currency on the Tenant.
6. **Billing period:** Monthly.
7. **Save** → copy the price ID (`price_...`) from the product page.
8. Keep a sticky note with all three price IDs — you'll paste them
   into Render in step 5.

## 3. Configure the Customer Portal (3 min)

Without this, the `/api/stripe/portal` endpoint 500s.

1. **Settings** → **Billing** → **Customer portal**.
2. Enable **Customer portal**.
3. **Subscriptions:** allow customers to update plan, cancel, switch
   plans. Product catalog: all three plans.
4. **Invoice history:** on.
5. **Payment methods:** on.
6. Save.

## 4. Create the webhook endpoint (5 min)

1. **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:** `https://invoices.aisolutionsbb.com/api/stripe/webhook`.
   (Use the staging URL if you haven't set up the custom domain yet —
   you'll have to update the webhook later, which is why custom domain
   is step 2 in the Phase 1B order.)
3. **Events to send:** select these three:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. **Save**, then on the endpoint page click **Reveal** under
   *Signing secret*. Copy the `whsec_...` value.

## 5. Paste env vars into Render (3 min)

Render dashboard → `aisb-invoicer` Web Service → **Environment** →
add or update:

| Key | Value | Where it comes from |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Developers → API keys → Secret key |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Developers → API keys → Publishable key (not yet used server-side; future-proofing) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Step 4 above |
| `STRIPE_PRICE_STARTER` | `price_...` | Starter product in step 2 |
| `STRIPE_PRICE_GROWTH` | `price_...` | Growth product in step 2 |
| `STRIPE_PRICE_PRO` | `price_...` | Pro product in step 2 |

Save → Render redeploys (~2 min).

## 6. Smoke test (5 min)

End-to-end test in incognito so the auth cookie is fresh:

1. https://invoices.aisolutionsbb.com → **Sign in** → check email →
   click magic link → land in dashboard.
2. Click **Billing** in the nav. The three plans should render with
   BBD prices.
3. Click **Subscribe** on Starter → redirects to Stripe Checkout →
   pay with a real card if you're testing live, or `4242 4242 4242 4242`
   if you're in test mode.
4. Success page redirects to `/settings?billing=success` with the
   green success banner.
5. **Verify the webhook fired:** Stripe dashboard → Webhooks → your
   endpoint → see a successful `customer.subscription.created` delivery.
6. Refresh `/settings` — Subscription block should now read
   "Starter — active" with a "Renews <date>" line.
7. **Test the portal:** click *Manage billing* → Stripe Customer Portal
   opens → cancel the subscription. Within a few seconds the
   `customer.subscription.updated` webhook flips
   `cancelAtPeriodEnd = true` on the Tenant row. The settings block
   should now read "Starter — ends <date>".

## 7. Verify the trial-expiry gate (optional, 2 min)

Useful before letting real signups happen:

1. With a Stripe-active tenant, create an invoice — should succeed.
2. Manually flip the tenant in the database to `trialing` with
   `trialEndsAt` set to yesterday (via `psql` or Prisma Studio):
   `UPDATE "Tenant" SET "subscriptionStatus" = 'trialing',
   "trialEndsAt" = NOW() - INTERVAL '1 day' WHERE id = '<tenant-id>';`
3. Reload the dashboard — red expired-trial banner appears, **New
   invoice** still navigates, but the POST to `/api/invoices` returns
   402 `subscription_required`. Existing invoices still open and the
   PDFs still download.
4. Subscribe → banner goes away, creation works again.

## What happens behind the scenes

- The signup flow creates a Tenant with `subscriptionStatus="trialing"`,
  `trialEndsAt=now+14d`. No Stripe customer yet.
- First Subscribe click creates a Stripe customer lazily (so trialing
  tenants never appear in Stripe).
- Checkout success fires `customer.subscription.created` → our webhook
  writes `stripeSubscriptionId`, `subscriptionStatus="active"`,
  `subscriptionPlan="<slug>"`, `currentPeriodEnd`, `cancelAtPeriodEnd`
  onto the Tenant row.
- Plan changes, cancellations, and failed payments fire
  `customer.subscription.updated` → same writer keeps the row in sync.
- Cancellation fires `customer.subscription.deleted` →
  `subscriptionStatus="canceled"`.
- `canCreateInvoices(tenant)` in `src/lib/plans.ts` is the only place
  enforcing the paywall — `status === "active"` always works, or
  `status === "trialing" && trialEndsAt > now`. Read paths are
  intentionally never gated.

## Failure modes

- **Webhook delivery fails (403/500):** Stripe shows the failed delivery
  in the dashboard. Click into it for the response body. Usually
  either `STRIPE_WEBHOOK_SECRET` is wrong (signature mismatch) or
  the Tenant lookup failed (subscription has no `metadata.tenantId`
  and no matching `stripeCustomerId`).
- **Plan shows as the raw slug after subscribe:** the webhook can't
  map the price ID — make sure all three `STRIPE_PRICE_*` env vars
  are populated and match the live-mode price IDs (not test mode).
- **Checkout 500s:** check Render logs for `stripe/checkout error`.
  Most likely: missing env var, or the customer portal isn't enabled
  (step 3 above).
