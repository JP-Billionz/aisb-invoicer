# Status — Day 2 (Phase 1B scaffolding)

**Date:** 2026-05-19
**Author:** Claude Code (claude-opus-4-7)
**Repo:** https://github.com/JP-Billionz/aisb-invoicer
**Staging URL:** https://aisb-invoicer.onrender.com (Phase 1A — still on
the onrender.com host until [CUSTOM-DOMAIN.md](./PHASE-1B-SETUP/CUSTOM-DOMAIN.md)
is executed)
**Production URL (target):** https://invoices.aisolutionsbb.com
**Deployed commit on `main`:** see latest push — Phase 1B scaffolding
landed in commits `f77f01a` (SendGrid + custom-domain docs) and
`837f8c0` (Stripe end-to-end).

## TL;DR

Phase 1B is **code-complete and gated on env vars**. Every code path
for the four-item brief (SendGrid live email, custom domain, Stripe
billing, AISB-as-tenant-#1) is in place; nothing is wired to live
services because none of that needs new code — it's all account
creation + key paste + DNS work that only Jamai can do.

Four step-by-step guides live under `docs/PHASE-1B-SETUP/`:

| # | Guide | Time | Who |
|---|---|---|---|
| 1 | [SENDGRID.md](./PHASE-1B-SETUP/SENDGRID.md) | ~20 min | Jamai |
| 2 | [CUSTOM-DOMAIN.md](./PHASE-1B-SETUP/CUSTOM-DOMAIN.md) | ~10 min | Jamai |
| 3 | [STRIPE.md](./PHASE-1B-SETUP/STRIPE.md) | ~40 min | Jamai |
| 4 | [ONBOARD-TENANT-1.md](./PHASE-1B-SETUP/ONBOARD-TENANT-1.md) | ~15 min | Jamai |

Do them in that order — each unblocks the next.

## What was built today

### 1. SendGrid live magic-link email (`f77f01a`)

- `src/lib/email.ts` already had a SendGrid branch from Phase 1A. Today:
  - Added an HTML body matching the dark-theme brand (lavender +
    green-purple-green strip, `#7C3AED` CTA button).
  - Kept the plain-text fallback for clients that strip HTML.
  - Updated the dev-fallback comment to reflect that it's now
    "no API key set" not "Phase 1A".
- Setup guide: `docs/PHASE-1B-SETUP/SENDGRID.md` — account creation,
  Cloudflare CNAMEs with **proxy OFF** (a common pitfall), restricted
  API key with Mail Send scope only.
- **No new dependency** — raw fetch to `api.sendgrid.com/v3/mail/send`.

### 2. Custom domain `invoices.aisolutionsbb.com` (`f77f01a`)

- No code changes — this is pure ops. The Cloudflare CNAME points at
  `aisb-invoicer.onrender.com` (or whatever Render shows in the
  Custom Domain dialog), proxy **DNS only**.
- Setup guide: `docs/PHASE-1B-SETUP/CUSTOM-DOMAIN.md` — covers Render
  Custom Domain UI, CNAME proxy gotcha, the **`NEXTAUTH_URL` flip
  is mandatory** (magic-link callbacks 403 otherwise), and the
  optional 301 redirect from the onrender.com URL.

### 3. Stripe billing end-to-end (`837f8c0`)

The biggest piece. Soft-tier model per Jamai's decision:
**Starter $29 / Growth $59 / Pro $99 (BBD)**. Differentiation:

- Starter: keeps the "Powered by AI Solutions Barbados" PDF footer.
- Growth: white-labels the footer + email support, 1-business-day SLA.
- Pro: priority email support, 4-business-hour SLA.

Schema:
- `Tenant.currentPeriodEnd: DateTime?`, `Tenant.cancelAtPeriodEnd: Boolean`.
- Migration `20260518000000_stripe_billing_fields` (hand-written, matches
  the init migration's style; idempotent under `prisma migrate deploy`).

Code:
- `src/lib/plans.ts` — single source of truth for the three tiers,
  `canCreateInvoices()` gate, `subscriptionLabel()` formatter,
  `planForPriceId()` lookup.
- `src/lib/stripe.ts` — singleton client (throws lazily so unrelated
  routes still build without a key), pinned to API `2025-02-24.acacia`
  (the SDK's latest).
- `POST /api/stripe/checkout` — creates the Stripe customer lazily
  on first checkout (trialing tenants don't pollute Stripe).
- `POST /api/stripe/portal` — Customer Portal redirect.
- `POST /api/stripe/webhook` — raw-body signature verification;
  handles `customer.subscription.{created,updated,deleted}`; resolves
  tenant via `subscription.metadata.tenantId` with `stripeCustomerId`
  fallback. Returns 200 on unhandled events (so they don't retry
  forever).

UI:
- `/billing` page — three plan cards with Subscribe / Switch /
  Current-plan states, "Most popular" tag on Growth, Manage Billing
  button when a Stripe customer exists.
- `/settings` — new Subscription block (status, plan, period end,
  Manage button), success banner on `?billing=success`.
- Dashboard layout — Billing nav link added, trial-countdown banner
  links to `/billing`, red expired-trial banner appears when
  `canCreateInvoices(tenant) === false`.

Enforcement:
- `POST /api/invoices` returns **402 `subscription_required`** when
  the trial is over and there's no active subscription.
- Read paths (list, view, PDF, settings) stay open at all times — per
  the "block creation, allow read" UX choice.

Setup guide: `docs/PHASE-1B-SETUP/STRIPE.md` — covers account
activation, three live products in BBD (with a USD fallback note in
case Stripe hasn't enabled BBD for the account), Customer Portal
config, webhook endpoint, env vars, end-to-end smoke test, and a
trial-expiry gate verification step.

### 4. AISB as tenant #1 walkthrough

- `docs/PHASE-1B-SETUP/ONBOARD-TENANT-1.md` — step-by-step for Jamai
  to sign up the AISB tenant, fix the auto-derived business profile
  via SQL (until the editable settings form ships), subscribe to Pro,
  and issue the first real customer invoice.

## Verified locally

- `npx next build` clean — 16 routes, zero errors, zero warnings.
- TypeScript strict still passes.
- `prisma generate` clean against the updated schema.

## Decisions made along the way

- **Tier differentiation is just the footer + support tier.** Per
  Jamai's "soft tiers" choice. No per-tenant counters in the schema —
  cheaper to ship, easier to add gates later if Pro wants to charge
  for actual feature differences.
- **`Tenant.subscriptionStatus` stores Stripe's vocabulary verbatim**
  (`trialing`, `active`, `past_due`, `canceled`, `incomplete`,
  `incomplete_expired`, `unpaid`). No mapping layer — easier to debug,
  no drift when Stripe adds new statuses, only the gate logic in
  `canCreateInvoices` cares.
- **Stripe customer is created lazily** at first checkout, not at
  signup. Trialing tenants who never subscribe don't pollute Stripe.
- **The 402 status on subscription-required** is the standard "Payment
  Required" semantic. Frontends can branch on `code === "subscription_required"`.
- **No new Render cron job.** With status stored verbatim and the gate
  computed at read time (`status === "active" || (status === "trialing"
  && trialEndsAt > now)`), there's no need to nightly-mutate trialing
  tenants. The dashboard banner reflects expiry without any
  background work.
- **Soft-tier footer override.** The Phase 1A kickoff said "keep the
  'Powered by AISB' footer on every PDF". The Phase 1B tier choice
  ("Growth/Pro remove it") supersedes — this is the white-label
  upsell. Called this out before implementing; assuming green light.

## What's left for Phase 1B execution (Jamai's work)

In strict order — each step unblocks the next:

1. **SendGrid** ([SENDGRID.md](./PHASE-1B-SETUP/SENDGRID.md))
   — ~20 min, requires Cloudflare DNS access.
2. **Custom domain** ([CUSTOM-DOMAIN.md](./PHASE-1B-SETUP/CUSTOM-DOMAIN.md))
   — ~10 min, requires Cloudflare + Render dashboard.
3. **Stripe** ([STRIPE.md](./PHASE-1B-SETUP/STRIPE.md))
   — ~40 min, requires Stripe account activation and a business card
   on file.
4. **Onboard AISB as tenant #1** ([ONBOARD-TENANT-1.md](./PHASE-1B-SETUP/ONBOARD-TENANT-1.md))
   — ~15 min, plus whatever time the first real customer invoice
   takes to fill out.

After step 3 the SaaS can take revenue. After step 4 AISB is the
first paying customer.

## Phase 1B carryover (deferred but not blocking revenue)

Same as the Day 1 list, still open:

- **Editable settings form** — `/settings` is read-only. Onboarding
  AISB as tenant #1 requires one SQL UPDATE to fix the auto-derived
  business name + address until the form ships.
- **Edit + delete invoice UI** — API routes exist (`PUT`/`DELETE
  /api/invoices/:id`); dashboard doesn't expose them.
- **Customer-name + date-range filters** on the invoices list.
- **Sentry + Plausible** wizard-install.
- **Per-tenant numbering load test** — 10 concurrent POSTs against
  the same tenant, confirm no duplicate `number` values under
  contention.
- **Logo on the PDF** — `Tenant.logoUrl` is in the schema; `src/lib/pdf.ts`
  doesn't render it yet. Polish item.
- **Better Stack monitoring** on `/api/health`.

## Blockers needing a human decision

None right now. The four items in the brief are fully unblocked from
the code side — every remaining step is Jamai's to execute via the
setup guides.

Edge case to flag: **Stripe may not have BBD enabled by default for
new accounts.** If the currency dropdown in step 2 of the Stripe guide
doesn't show BBD, options are (a) open Stripe support and wait ~1
business day for BBD activation, (b) launch in USD at the same numbers
($29/$59/$99) — the Tenant + Invoice schemas track currency
independently. Up to Jamai which to do.

## File map of what was added today

```
docs/PHASE-1B-SETUP/
  SENDGRID.md              (new — SendGrid setup walkthrough)
  CUSTOM-DOMAIN.md         (new — Cloudflare + Render custom domain)
  STRIPE.md                (new — products, webhook, smoke test)
  ONBOARD-TENANT-1.md      (new — AISB as the first paying tenant)

prisma/
  schema.prisma                                       (currentPeriodEnd, cancelAtPeriodEnd on Tenant)
  migrations/20260518000000_stripe_billing_fields/
    migration.sql                                     (new)

src/
  lib/
    email.ts                  (HTML branded body)
    plans.ts                  (new — soft-tier metadata + canCreateInvoices)
    pdf.ts                    (showPoweredByFooter prop)
    stripe.ts                 (new — singleton client)
  app/api/stripe/
    checkout/route.ts         (new — Hosted Checkout)
    portal/route.ts           (new — Customer Portal redirect)
    webhook/route.ts          (new — signature verification + sync)
  app/api/invoices/route.ts   (402 gate via canCreateInvoices)
  app/api/invoices/[id]/pdf/route.ts (passes plan-based footer flag)
  app/(dashboard)/
    layout.tsx                (Billing nav, expired-trial banner)
    settings/page.tsx         (subscription block + Manage button)
    billing/page.tsx          (new — three plan cards)
  components/
    BillingActions.tsx        (new — Subscribe + Manage client buttons)

.env.example                  (clearer Stripe var comments)
package.json                  (stripe ^17.7.0)
```

Roughly 700 lines added.
