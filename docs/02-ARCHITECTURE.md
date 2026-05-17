# Architecture — AISB Invoicer SaaS

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + backend | **Next.js 14 (App Router)** + TypeScript strict | Single codebase, server components for fast loads, API routes for backend, mature Stripe + NextAuth ecosystem |
| Styling | **Tailwind CSS** | Fast iteration, design tokens map cleanly to brand colours |
| Database | **PostgreSQL** on Render Postgres (or Neon if Render Postgres unavailable) | Standard, daily backups, integrates with Prisma |
| ORM | **Prisma** | Type-safe queries, easy migrations, plays well with tenant middleware |
| Auth | **NextAuth (Auth.js v5)** with Email provider + SendGrid SMTP | Magic links, no passwords, NextAuth has battle-tested tenant patterns |
| Billing | **Stripe Billing** (subscriptions) + Checkout | Best DX, supports BBD via card processing in USD with display conversion |
| Email (transactional) | **SendGrid** free tier | Magic links, invoice PDFs to customers (later) |
| PDF generation | **jsPDF + jspdf-autotable** server-side via Node | Reuse the existing PDF design verbatim from the current app |
| Hosting | **Render** Web Service + Postgres | Single dashboard, auto-deploy from GitHub, generous free tier for prototypes |
| DNS / SSL | **Cloudflare** | Free, edge cache, simple custom domain setup |
| Error monitoring | **Sentry** free tier | Catch errors before customers report them |
| Analytics | **Plausible** or **Fathom** | Privacy-respecting, no cookies, ToS compliant |

## Directory layout

```
aisb-invoicer/
├── README.md
├── .gitignore                  # node_modules, .next, .env, etc.
├── .env.example                # documents all required env vars
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── prisma/
│   ├── schema.prisma           # see 03-DATA-MODEL.md
│   └── migrations/             # auto-generated
├── src/
│   ├── app/
│   │   ├── (marketing)/        # public landing
│   │   │   └── page.tsx
│   │   ├── (auth)/             # signup, signin, magic-link callback
│   │   │   └── ...
│   │   ├── (dashboard)/        # tenant-scoped app
│   │   │   ├── layout.tsx      # enforces auth + tenant context
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx           # history view
│   │   │   │   ├── new/page.tsx       # new invoice form
│   │   │   │   └── [id]/page.tsx      # view/edit existing
│   │   │   └── settings/page.tsx      # tenant settings
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── invoices/route.ts          # POST create, GET list
│   │   │   ├── invoices/[id]/route.ts     # GET/PUT/DELETE
│   │   │   ├── invoices/[id]/pdf/route.ts # GET → PDF stream
│   │   │   ├── stripe/checkout/route.ts
│   │   │   └── stripe/webhook/route.ts
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── tenant.ts           # tenant-scoped query wrapper (CRITICAL)
│   │   ├── auth.ts             # NextAuth config
│   │   ├── stripe.ts           # Stripe client + plan definitions
│   │   ├── pdf.ts              # jsPDF invoice rendering
│   │   └── validation.ts       # Zod schemas
│   ├── components/             # React components (UI primitives)
│   └── styles/globals.css
└── tests/                      # vitest + playwright e2e
```

## The tenant isolation rule (NON-NEGOTIABLE)

Every database table that holds customer-owned data has a `tenant_id`
column. Every query reads/writes only rows where `tenant_id` matches the
**authenticated user's tenant**, enforced at the framework level:

```ts
// src/lib/tenant.ts
export async function withTenant<T>(
  fn: (tx: { tenantId: string; db: PrismaClient }) => Promise<T>
): Promise<T> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthorizedError();
  return fn({ tenantId: session.user.tenantId, db: prisma });
}
```

Every API route handler MUST wrap its DB access in `withTenant(...)`.
Raw `prisma.invoice.findMany()` without a tenant filter is a code-review
auto-reject. Add an ESLint rule to flag direct `prisma.X.find` calls
outside `src/lib/`.

## API surface (V.1.0)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signin/email` | Send magic link |
| GET  | `/api/auth/callback/email` | Verify magic link → session |
| GET  | `/api/invoices` | List current tenant's invoices (paginated) |
| POST | `/api/invoices` | Create new invoice, increments tenant counter |
| GET  | `/api/invoices/:id` | Fetch a single invoice (tenant-scoped) |
| PUT  | `/api/invoices/:id` | Update an invoice |
| DELETE | `/api/invoices/:id` | Soft-delete an invoice |
| GET  | `/api/invoices/:id/pdf` | Stream the PDF |
| POST | `/api/stripe/checkout` | Create a Stripe Checkout session |
| POST | `/api/stripe/webhook` | Stripe → us, update subscription_status |
| GET  | `/api/me` | Current user + tenant settings |
| PUT  | `/api/settings` | Update tenant settings |

## Environment variables

```bash
# DB
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_URL=https://invoices.aisolutionsbb.com
NEXTAUTH_SECRET=<openssl rand -base64 32>
EMAIL_FROM=AISB Invoicer <noreply@aisolutionsbb.com>
SENDGRID_API_KEY=SG.xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_GROWTH=price_xxx
STRIPE_PRICE_PRO=price_xxx

# Monitoring
SENTRY_DSN=https://...
PLAUSIBLE_DOMAIN=invoices.aisolutionsbb.com

# App
NODE_ENV=production
```

`.env.example` documents these for the team; the real values live in
the 1Password vault and in Render's env-var settings.

## Deployment topology

```
Cloudflare DNS
    │
    ├── invoices.aisolutionsbb.com  → Render Web Service (Next.js)
    │                                      │
    │                                      ├── Render Postgres (managed)
    │                                      ├── Stripe (external)
    │                                      ├── SendGrid (external)
    │                                      └── Sentry (external)
    │
    └── status.aisolutionsbb.com    → Better Stack (status page)
```
