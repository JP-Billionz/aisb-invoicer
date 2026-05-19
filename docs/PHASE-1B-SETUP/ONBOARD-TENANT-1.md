# Onboarding AISB as tenant #1

Phase 1B step 4. Use the live SaaS to bill AISB's first real invoice.
This both proves the production path end-to-end and gives AISB its own
SaaS-issued invoice trail for accounting.

## Prerequisites

These three must be done first or the experience will be partly broken:

- [ ] [SENDGRID.md](./SENDGRID.md) complete — magic links arrive in inbox.
- [ ] [CUSTOM-DOMAIN.md](./CUSTOM-DOMAIN.md) complete — signin works at
      `invoices.aisolutionsbb.com` (or accept the onrender.com URL).
- [ ] [STRIPE.md](./STRIPE.md) complete — live products + webhook + env vars.

If any of those aren't done, do them first. Onboarding without them
means hand-typed magic links and no working subscription.

## 1. Sign up as the AISB tenant (3 min)

1. Open https://invoices.aisolutionsbb.com in incognito.
2. **Sign in** → enter `billing@aisolutionsbb.com` (or whichever
   address AISB wants to use for SaaS notifications — this becomes
   the Tenant.email and the magic-link recipient).
3. Check inbox → click the magic-link button → land in dashboard.
4. **Confirm the tenant was auto-created** with sensible defaults:
   `/settings` should show:
   - Business name: `billing` (auto-derived from email local-part)
   - Default currency: BBD
   - Next invoice #: 10027
   - Subscription: Trial — 14 days left

## 2. Fix up the business profile (2 min — manual DB edit until the
   settings editor ships)

The editable settings form is on the carryover list for Phase 1B. Until
that's there, fix the auto-derived values via Prisma Studio or `psql`:

```sql
UPDATE "Tenant" SET
  "businessName"        = 'AI Solutions Barbados',
  "address"             = '<AISB registered address, line 1\nline 2\nBridgetown, Barbados>',
  "phone"               = '<AISB main number>',
  "email"               = 'billing@aisolutionsbb.com',
  "invoiceNumberPrefix" = 'AISB-',
  "defaultNotes"        = 'Payment due on receipt. Bank: <bank name>, Acct: <acct #>.'
WHERE "email" = 'billing@aisolutionsbb.com';
```

If you want a logo on the PDF, the `logoUrl` field is in the schema
but `src/lib/pdf.ts` doesn't render it yet — that's a Phase 1C polish
item, not blocking. PDFs will render brand-correct without a logo.

## 3. Subscribe (1 min)

Pick the plan AISB will run on. Recommendation: **Pro** — eat your own
dog food on the white-label tier, and it gives priority support to
yourself when something breaks at 11pm.

1. Click **Billing** in the nav.
2. Click **Subscribe** on Pro → Stripe Checkout → pay with the AISB
   business card.
3. Redirect back to `/settings?billing=success`. Within ~5 seconds the
   Subscription block flips to "Pro — active" once the webhook fires.

Stripe will invoice AISB monthly from now on. (This is Stripe billing
AISB for the SaaS, not the AISB-to-customer invoices that get created
inside the SaaS — keep that distinction clear.)

## 4. Issue the first real customer invoice (5 min)

Pick one real outstanding bill AISB owes a customer. Use the SaaS to
issue it instead of the V.1 single-page app.

1. Click **New invoice**.
2. Fill in:
   - **Bill to** — customer name, address, email, phone.
   - **Issue date** — today.
   - **Due date** — usually +30 days.
   - **Currency** — BBD unless the customer is overseas.
   - **VAT** — toggle on if applicable; default 17.5% is the Barbados
     standard rate.
   - **Line items** — description, qty, unit rate. Add as many rows as
     needed; totals recompute live.
   - **Notes** — bank details, payment terms.
3. **Create invoice** → redirects to the invoice list with the new row
   at the top (number `AISB-10027`).
4. Click into the invoice → **Download PDF**. Open it.
   - Lavender header band ✓
   - Green-purple-green accent strip ✓
   - Items table with brand-purple header ✓
   - Totals block ✓
   - **No "Powered by AI Solutions Barbados" footer** (Pro tier
     white-labels it) ✓
5. Email the PDF to the customer via your normal channel.

## 5. Reconcile (5 min, when payment lands)

When the customer pays, mark the invoice paid. The Phase 1A status
field is `issued | paid | void`; the UI for flipping it ships in the
edit-invoice work on the carryover list. Until then:

```sql
UPDATE "Invoice" SET "status" = 'paid' WHERE "id" = '<invoice-id>';
```

## What success looks like

- AISB has an active Pro subscription in the SaaS, billed monthly by
  Stripe.
- AISB has issued its first real customer invoice through the SaaS.
- The PDF looks brand-correct and white-labeled.
- The trial-expiry banner is gone (replaced by nothing — active subs
  have no banner).

## Useful follow-ups

- Add a second user to the AISB tenant once the invite flow ships
  (Phase 1B carryover item).
- Migrate old invoices from the V.1 app — write a one-shot import
  script that reads the V.1 HTML's localStorage export and inserts
  rows with explicit `number` values, bypassing the auto-increment.
  Sequence preserved.
- Set Better Stack to monitor `/api/health` so any downtime pages
  Jamai before customers notice.
