# AISB Invoicer — Project Specification

## What it is
A multi-tenant SaaS web app that lets a small business create, save, and
export professional PDF invoices. The first commercial product of AI
Solutions Barbados.

## Who it's for
Small and medium businesses in the Caribbean (Barbados-first) that today
either use a manual Word/Excel template or pay BBD $80–200/month for a
full bookkeeping suite (QuickBooks, Wave) when all they actually need is
clean, branded, sequenced invoices.

## What it does (V.1.0 scope — what we ship for the live launch)

### Invoicing core
1. **Create an invoice** — bill-from (auto-populated from tenant settings),
   bill-to (customer details), line items (description / qty / rate /
   auto-calculated amount), notes, due date, currency, optional VAT.
2. **Auto-number invoices per tenant** — each tenant gets their own
   counter starting at 10027 (configurable). Numbers advance only on
   successful save+export.
3. **Save invoices** — every invoice is persisted to the database under
   the authenticated tenant.
4. **List/search invoices** — history view of all invoices for the tenant,
   filterable by date range and customer name.
5. **Re-export to PDF** — open any saved invoice and regenerate the PDF.
6. **Delete invoices** — with confirmation. Soft delete (set deleted_at).

### Tenant settings
- Business name, address, email, phone — auto-populates the bill-from
- Logo upload (transparent PNG preferred)
- Default currency (BBD, USD, EUR, GBP, TTD)
- Default VAT rate (e.g. 17.5%)
- Invoice number prefix (optional) and starting number (default 10027)
- Default payment terms text

### Auth
- Email magic link signup (no passwords) via NextAuth + SendGrid
- On first signup the system creates a new tenant and makes the user
  its owner.
- Subsequent users invited via email by the tenant owner (Phase 1B —
  not in V.1.0).

### Billing
- Stripe Checkout subscriptions
- 3 plans:
  - Starter — BBD $29/mo (5 invoices/mo, 1 user)
  - Growth — BBD $59/mo (50 invoices/mo, 3 users)
  - Pro    — BBD $99/mo (unlimited)
- 14-day free trial, no card required at signup
- Stripe webhooks update tenant.subscription_status

## What it does NOT do (out of scope for V.1.0)
- Quotes / estimates (consider for V.1.1)
- Recurring invoices
- Stripe payment links inside invoices (so customers can pay you)
- Multi-currency conversion or FX
- Reports / dashboards beyond a basic dashboard tile
- Mobile native app (PWA-friendly responsive web is enough for now)
- Integrations with QuickBooks / Xero / Wave (Phase 2 of the platform)

## Brand and design
- Dark theme (matches the in-app aesthetic of the current AISB Invoicer V.1)
- Brand purple: `#7C3AED` (deep variant `#5620AF`)
- Brand green:  `#39D353`
- Logo: see `reference-current-app/logo.png` (transparent) for app header,
  and the rendered PDF design from the current app for invoice output
- "Powered by AI Solutions Barbados" footer mark on every PDF
- Invoice PDF layout exactly mirrors the current app's PDF (lavender
  header gradient → green-purple-green strip → items → totals → footer)

## Quality bar
- Lighthouse 90+ on the landing page
- Page load <2s on a mid-tier mobile
- TypeScript strict mode, zero `any` in tenant-scoped code paths
- All inputs validated on the server (Zod)
- Stripe webhook signature verification ON

## Success metrics (review at Day 30)
- 5 active paying tenants
- <1 hour/week support volume
- Zero invoice-numbering collisions (the same number issued twice within a tenant)
- Trial→paid conversion ≥ 30%
