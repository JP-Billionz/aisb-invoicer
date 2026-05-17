# Status — Day 1 (Phase 1A)

**Date:** 2026-05-17
**Author:** Claude Code (claude-opus-4-7)
**Repo:** https://github.com/JP-Billionz/aisb-invoicer
**Staging URL:** _pending — needs Jamai to click-deploy the Render Blueprint (see [DEPLOY-CHECKLIST.md](../DEPLOY-CHECKLIST.md))_

## TL;DR

Phase 1A code is on `main`. The project type-checks, the production
build is green, and a `render.yaml` Blueprint defines both the Web
Service and Render Postgres so deploy is a 5-minute click-through.
The one remaining step before a live URL exists is human-in-the-loop:
log into Render → New → Blueprint → pick the repo → paste two env
vars. I'll update this file with the staging URL once you confirm.

## What works (verified locally)

- ✅ Next.js 14 App Router + TypeScript strict — `tsc --noEmit` clean
- ✅ Tailwind dark theme with brand palette (#7C3AED purple, #39D353 green)
- ✅ Prisma schema matches `docs/03-DATA-MODEL.md` exactly
  (Tenant, User, Invoice + NextAuth Account/Session/VerificationToken,
  `[tenantId, number]` unique, soft-delete via `deletedAt`)
- ✅ NextAuth (Auth.js v5) email magic-link, Prisma adapter, database sessions
- ✅ `events.createUser` callback creates a Tenant on first signup, sets
  `nextInvoiceNumber = 10027` and `trialEndsAt = +14 days`
- ✅ Tenant isolation enforced through `withTenant({ db, tenantId, userId })`
  in `src/lib/tenant.ts` — every invoice API route and dashboard page
  uses it
- ✅ `POST /api/invoices` increments the per-tenant counter and inserts
  the invoice in a single `$transaction` (Rule 3 from the data-model spec)
- ✅ Bill-from snapshotted on Invoice at create time (Rule 4)
- ✅ Soft-delete only (`DELETE /api/invoices/:id` sets `deletedAt`)
- ✅ Server-side jsPDF render with the V.1 design language:
  lavender header band, green-purple-green accent strip, branded
  totals block, "Powered by AI Solutions Barbados" footer
- ✅ Marketing page, sign-in page, check-email page, dashboard layout
  (with trial countdown banner), invoices list, new-invoice form,
  read-only settings page
- ✅ `/api/health` returns `{ ok: true }` for Render's health check
- ✅ Validation via Zod (`createInvoiceSchema` — rejects 0-item invoices
  and missing customer name per spec edge cases)
- ✅ `next build` produces 12 routes, no errors, no warnings
- ✅ `render.yaml` Blueprint provisions Web Service + Postgres in one
  step, with `DATABASE_URL` auto-wired and `NEXTAUTH_SECRET` auto-generated

## What's left for Phase 1A (one human step)

**Deploy.** I cannot deploy from this session — Render needs an account
login, GitHub-repo connection, and Render Postgres provisioning, none of
which I have credentials for. The Blueprint makes this trivial:

1. Render Dashboard → **New** → **Blueprint** → connect
   `JP-Billionz/aisb-invoicer` → Apply.
2. After provisioning: set `NEXTAUTH_URL` to the assigned `*.onrender.com`
   URL. (Leave `SENDGRID_API_KEY` blank — magic links print to logs.)
3. Wait ~5 minutes for the first build.
4. `curl https://aisb-invoicer.onrender.com/api/health` should return
   `{"ok":true,...}`.
5. Paste the staging URL into our chat and I'll update this file.

Full step-by-step in [`DEPLOY-CHECKLIST.md`](../DEPLOY-CHECKLIST.md).

## Blockers needing a human decision

None blocking — but two heads-up items for Phase 1B planning:

1. **Live email send (SendGrid)** — Phase 1A intentionally logs magic
   links to the server console (per your "skip live email today"
   instruction). To turn on live send in Phase 1B I'll need a SendGrid
   API key with `Mail Send` scope, and the `aisolutionsbb.com` sender
   domain authenticated in SendGrid (CNAME records added in Cloudflare).
2. **Custom domain** — `invoices.aisolutionsbb.com` requires a CNAME in
   Cloudflare pointing at the Render-assigned hostname. Not strictly
   required for Phase 1B but worth doing before Stripe goes live so the
   webhook URL is stable.

## Phase 1B scope (next session)

In rough priority order:

1. **Cut the initial Prisma migration.** Phase 1A uses `prisma db push`
   so the first deploy could schema-sync against an empty database.
   Once the live DB exists I'll run `prisma migrate dev --name init`
   against it, commit the migration, and switch the build to
   `prisma migrate deploy`.
2. **SendGrid wire-up** — flip the `if (SENDGRID_API_KEY)` branch in
   `src/lib/email.ts` (already written, just needs the key).
3. **Stripe billing**:
   - Three products (Starter / Growth / Pro) at BBD $29 / $59 / $99
   - `POST /api/stripe/checkout` → Checkout session
   - `POST /api/stripe/webhook` with signature verification → updates
     `Tenant.subscriptionStatus` + `subscriptionPlan`
   - Trial-expiry cron job (Render Cron Job, daily)
4. **Per-tenant invoice numbering hardening** — current implementation
   uses Postgres `$transaction` for atomic counter increment, which
   matches Rule 3 of the data-model spec. Worth a load test with 10
   concurrent saves to confirm no collisions before launch.
5. **Tenant settings editor** — currently the settings page is
   read-only. Add an editable form (business name, address, currency,
   VAT rate, prefix, next number, logo upload).
6. **Edit invoice** + **delete invoice** UI — the API routes exist
   (`PUT`/`DELETE /api/invoices/:id`); the dashboard pages don't expose
   them yet. The edit page wasn't on Phase 1A's punch list.
7. **Customer-name and date-range filters** on the invoices list
   (spec calls for them; Phase 1A shows the most recent 25 unfiltered).
8. **Sentry + Plausible** — wizard-install both, document DSN/domain
   in env vars.
9. **Better Stack status page** monitoring `/api/health`.

## Decisions made along the way (no human input needed)

- **Auth.js v5 over v4.** Spec says "NextAuth"; v5 is the current
  stable line with cleaner App Router integration. No functional
  difference for the magic-link flow.
- **Database sessions, not JWT.** Required because the
  `session` callback reads `tenantId` off the User row at request time;
  JWT sessions would mean stale tenant data after settings edits.
- **`prisma db push` for the first deploy.** Needed because I have no
  live Postgres in this build env to cut a migration against. Switch
  to `migrate deploy` in Phase 1B as item 1 above.
- **Marketing page is minimal.** One headline, one CTA, one footer.
  Brand-correct but not "Lighthouse 90+ marketing-grade" yet — that's
  a Phase 1B polish pass when we know the live URL and can run the
  audit.
- **Settings page is read-only.** Phase 1A had "minimal create-invoice
  flow" as the UI goal; the editable settings form is Phase 1B (item 5).
- **No tenant invite UI.** Spec explicitly defers that to Phase 1B.
- **PDF design is a faithful re-creation of the V.1 layout from spec
  description.** The `reference-current-app/` folder mentioned in the
  kickoff prompt wasn't committed to the repo, so I mirrored the layout
  from the prose description in `01-PROJECT-SPEC.md` and `04-USER-FLOWS.md`
  (lavender header → green-purple-green strip → items table → totals →
  "Powered by AI Solutions Barbados" footer). If the V.1 HTML/PDF lands
  in the repo later, I'll cross-check pixel-for-pixel.

## File map of what was added today

```
README.md                               (rewritten — was 3-line stub)
DEPLOY-CHECKLIST.md                     (new — Render click-through guide)
render.yaml                             (new — Render Blueprint)
package.json, tsconfig.json,            (new — Next 14 + TS strict)
  next.config.mjs, tailwind.config.ts,
  postcss.config.mjs, .gitignore,
  .env.example
prisma/
  schema.prisma                         (matches docs/03-DATA-MODEL.md)
  seed.ts                               (1 demo tenant + 3 invoices)
src/
  app/
    layout.tsx, page.tsx                (marketing landing)
    signin/page.tsx                     (magic-link request)
    signin/check-email/page.tsx
    (dashboard)/layout.tsx              (auth-gated, trial banner)
    (dashboard)/invoices/page.tsx       (history list)
    (dashboard)/invoices/new/page.tsx
    (dashboard)/settings/page.tsx       (read-only Phase 1A)
    api/auth/[...nextauth]/route.ts
    api/health/route.ts
    api/invoices/route.ts               (POST create, GET list)
    api/invoices/[id]/route.ts          (GET, soft DELETE)
    api/invoices/[id]/pdf/route.ts      (server-side PDF stream)
  components/NewInvoiceForm.tsx         (client form, live totals)
  lib/
    db.ts                               (Prisma singleton)
    auth.ts                             (Auth.js v5 + Prisma adapter + tenant creation)
    auth-handlers.ts                    (handlers split for route file)
    email.ts                            (console-log Phase 1A → SendGrid Phase 1B)
    tenant.ts                           (withTenant wrapper — NON-NEGOTIABLE)
    validation.ts                       (Zod + computeTotals)
    pdf.ts                              (jsPDF + autoTable, brand layout)
  styles/globals.css                    (Tailwind + brand utility classes)
  types/next-auth.d.ts                  (Session.user.tenantId / role)
docs/STATUS-DAY-1.md                    (this file)
```

Roughly 1,200 lines of TypeScript + Prisma + Tailwind. No `any` in
tenant-scoped paths. Zero TS errors. Clean production build.
