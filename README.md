# AISB Invoicer

Multi-tenant SaaS invoicing platform by AI Solutions Barbados.

Spec docs live in [`/docs`](./docs). Deploy instructions in [`DEPLOY-CHECKLIST.md`](./DEPLOY-CHECKLIST.md).
Day-1 status: [`docs/STATUS-DAY-1.md`](./docs/STATUS-DAY-1.md).

## Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS, brand palette (`#7C3AED` purple, `#39D353` green)
- Prisma + PostgreSQL
- NextAuth (Auth.js v5) email magic links — live SendGrid wired in Phase 1B
- jsPDF + jspdf-autotable server-side PDF rendering
- Render Web Service + Render Postgres (via `render.yaml` Blueprint)

## Local development

```bash
cp .env.example .env             # then fill DATABASE_URL + NEXTAUTH_SECRET
npm install
npx prisma db push               # sync schema to your local Postgres
npx prisma db seed               # optional demo tenant + 3 invoices
npm run dev
```

Open http://localhost:3000. Magic-link URLs print to the terminal in Phase 1A.

## Tenant isolation (non-negotiable)

Every DB read/write of tenant-owned data MUST go through `withTenant(...)`
in [`src/lib/tenant.ts`](./src/lib/tenant.ts). Direct `prisma.invoice.find*`
calls outside `src/lib/` are forbidden — code review must reject them.
