# User Flows — AISB Invoicer SaaS

## Flow 1 — Signup (new tenant)

1. Visitor lands on `invoices.aisolutionsbb.com` (marketing page).
2. Clicks "Start free trial".
3. Form: email + business name.
4. POST `/api/auth/signin/email` → NextAuth sends magic link.
5. Visitor clicks magic link → callback creates new Tenant + User.
   - `Tenant.subscriptionStatus = "trialing"`, `trialEndsAt = +14 days`
   - `Tenant.nextInvoiceNumber = 10027`
   - `User.role = "owner"`, linked to the new tenant
6. Redirect to `/invoices/new` with an onboarding banner.

## Flow 2 — Returning user signin

1. Click "Sign in" → enter email → magic link sent.
2. Magic link valid 10 minutes, single use.
3. On callback, NextAuth finds the User, restores Session, redirects to `/invoices`.

## Flow 3 — Create + export invoice

1. `/invoices/new` page renders the form (mirror of current AISB Invoicer V.1).
2. Form pre-fills `fromName`, `fromAddress`, etc. from `Tenant`.
3. The "Invoice number" field shows `tenant.nextInvoiceNumber` (read-only).
4. User fills bill-to + line items + optional VAT.
5. Live recalculation of subtotal / VAT / total (client-side).
6. "Save & Export PDF" button:
   - Client POSTs `/api/invoices` with the payload.
   - Server validates (Zod), wraps the create in a transaction that:
     - Increments `tenant.nextInvoiceNumber`
     - Inserts Invoice with the just-issued number
   - Server returns the saved Invoice (with its `id` and `number`).
   - Client redirects to `/invoices/[id]/pdf` which streams the PDF.
7. The customer's browser downloads `AISB_Invoice_10027.pdf`.

## Flow 4 — Invoice history

1. `/invoices` shows a paginated table of all invoices for the tenant.
2. Columns: Invoice #, Date, Client, Items count, Total, Actions.
3. Filters: date range, customer name search, status.
4. Actions per row: View, Re-export PDF, Mark as paid, Delete.
5. Pagination at 25/page.

## Flow 5 — Edit existing invoice

1. `/invoices/[id]` opens an existing invoice in edit mode.
2. All fields editable EXCEPT `number` and `issueDate`.
3. "Save changes" updates the Invoice row.
4. "Re-export PDF" produces a fresh PDF with the latest data.

## Flow 6 — Delete invoice

1. From history or edit view → "Delete" button.
2. Confirm modal: "This will hide invoice #10027. You can restore from the archive."
3. POST `/api/invoices/:id/DELETE` sets `deletedAt = now()`.
4. Hidden from history list immediately.
5. (V.1.1 future: archive view for restoration.)

## Flow 7 — Tenant settings

1. `/settings` page.
2. Edit business name, address, email, phone.
3. Upload logo (PNG ≤ 1MB, transparent preferred).
4. Set default currency, VAT rate, invoice prefix, next number.
5. Save → updates Tenant row.

## Flow 8 — Upgrade trial → paid

1. Banner during trial: "X days left in trial — pick a plan".
2. Click "Upgrade" → `/billing` page shows 3 plan cards.
3. Pick plan → POST `/api/stripe/checkout` returns Stripe Checkout URL.
4. User completes Checkout on Stripe's hosted page.
5. Stripe Checkout success → redirects to `/billing/success`.
6. Stripe webhook `customer.subscription.created` fires →
   `Tenant.subscriptionStatus = "active"`, `subscriptionPlan = "growth"`.
7. User can now create unlimited invoices.

## Flow 9 — Trial expires unpaid

1. Cron job (Render Cron Job or Vercel Cron) checks daily.
2. Tenants with `trialEndsAt < now() AND subscriptionStatus = "trialing"` →
   set `subscriptionStatus = "past_due"`.
3. UI: banner says "Trial expired. Pick a plan to keep using AISB Invoicer."
4. Read-only access (can view + export old invoices, cannot create new ones)
   until upgrade.
5. After 30 days past_due → `subscriptionStatus = "canceled"`, data retained
   90 days then deletable.

## Flow 10 — Cancel subscription

1. `/billing` → "Cancel subscription" button.
2. Confirm dialog.
3. Stripe API → cancel at end of current billing period.
4. Webhook fires → `subscriptionStatus = "canceled"`.
5. User keeps access until period end, then read-only.

## Edge cases

### Two browser tabs creating invoices simultaneously
- Both POST `/api/invoices` at the same time.
- Postgres transaction serializes the counter increments.
- Both succeed; each receives a distinct sequential number.

### Tenant changes invoice prefix mid-life
- New invoices use the new prefix.
- Old invoices keep their original number (prefix wasn't stored on the row).
- (V.1.1: optionally store prefix snapshot on Invoice too.)

### Invoice with zero items
- Server-side validation rejects with 400 + "At least one line item required."

### Customer name missing
- Server-side validation rejects with 400.

### Logo upload fails
- Soft fail; tenant keeps using default branding. Surface an error toast.
- Don't block the user from invoicing.
