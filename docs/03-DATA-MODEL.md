# Data Model — AISB Invoicer SaaS

## Prisma schema (drop into `prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =========================================================
// Tenant — one per paying customer of AISB Invoicer
// =========================================================
model Tenant {
  id                  String   @id @default(cuid())
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Business profile (auto-fills bill-from)
  businessName        String
  address             String?
  email               String
  phone               String?

  // Branding
  logoUrl             String?       // hosted PNG; null until uploaded
  primaryColor        String   @default("#7C3AED")
  accentColor         String   @default("#39D353")

  // Invoice settings
  defaultCurrency     String   @default("BBD")
  defaultVatRate      Decimal  @default(17.5) @db.Decimal(5, 2)
  invoiceNumberPrefix String?
  nextInvoiceNumber   Int      @default(10027)
  defaultNotes        String?

  // Billing
  stripeCustomerId       String?  @unique
  stripeSubscriptionId   String?  @unique
  subscriptionStatus     String   @default("trialing")  // trialing|active|past_due|canceled
  subscriptionPlan       String   @default("starter")   // starter|growth|pro
  trialEndsAt            DateTime?

  users    User[]
  invoices Invoice[]

  @@index([stripeCustomerId])
}

// =========================================================
// User — belongs to a Tenant
// =========================================================
model User {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  email         String   @unique
  emailVerified DateTime?
  name          String?

  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  role          String   @default("owner")  // owner|member

  accounts      Account[]
  sessions      Session[]

  @@index([tenantId])
}

// NextAuth models (Account, Session, VerificationToken) — required as-is
// See https://authjs.dev/getting-started/adapters/prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// =========================================================
// Invoice — owned by a Tenant
// =========================================================
model Invoice {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  number       Int                       // tenant-scoped: unique with tenantId
  issueDate    DateTime
  dueDate      DateTime?
  currency     String   @default("BBD")

  // Bill-from snapshot at time of issue (so future tenant edits don't change historical invoices)
  fromName     String
  fromAddress  String?
  fromEmail    String?
  fromPhone    String?

  // Bill-to
  toName       String
  toAddress    String?
  toEmail      String?
  toPhone      String?

  // Items: JSONB array of { description, qty, rate }
  items        Json

  // Totals (computed at save time so historical invoices freeze the math)
  subtotal     Decimal  @db.Decimal(12, 2)
  vatRate      Decimal  @db.Decimal(5, 2)  @default(0)
  vatAmount    Decimal  @db.Decimal(12, 2) @default(0)
  total        Decimal  @db.Decimal(12, 2)
  vatApplied   Boolean  @default(false)

  notes        String?
  status       String   @default("issued")  // issued|paid|void

  @@unique([tenantId, number])
  @@index([tenantId, createdAt])
  @@index([tenantId, deletedAt])
}
```

## Tenant isolation rules

### Rule 1 — every tenant-owned table has `tenantId` and an index on it
Applied above: `User`, `Invoice`. Future tables (Customers, Quotes, etc.)
follow the same pattern.

### Rule 2 — composite uniqueness for per-tenant counters
`Invoice.@@unique([tenantId, number])` — same invoice number can exist
across different tenants but never within one tenant.

### Rule 3 — invoice numbering happens inside a transaction
The counter increment + invoice insert MUST be in one transaction to
prevent two concurrent saves issuing the same number. Pseudocode:

```ts
await prisma.$transaction(async (tx) => {
  const tenant = await tx.tenant.update({
    where: { id: tenantId },
    data: { nextInvoiceNumber: { increment: 1 } },
    select: { nextInvoiceNumber: true },
  });
  const newNumber = tenant.nextInvoiceNumber - 1;  // we just incremented
  await tx.invoice.create({
    data: { ...input, tenantId, number: newNumber },
  });
});
```

### Rule 4 — bill-from is snapshotted on invoice
The `from*` fields on Invoice copy from Tenant at create-time. If the
tenant later changes their business name, historical invoices show the
original name (correct behavior — invoices are legal records, not live data).

### Rule 5 — soft delete only
Invoices use `deletedAt` (nullable DateTime). Never DELETE rows. List
queries filter `deletedAt: null`.

## Indexes

- `Tenant.stripeCustomerId` — webhook lookup
- `User.tenantId` — login → tenant resolve
- `Invoice.[tenantId, createdAt]` — history list, newest first
- `Invoice.[tenantId, deletedAt]` — soft-delete filter

## Initial migration

Claude Code: after `prisma init` and saving the schema, run:

```bash
npx prisma migrate dev --name init
```

This produces the initial migration in `prisma/migrations/`. Commit it.

## Seed data (development)

`prisma/seed.ts` should create:
- 1 demo tenant (AISB itself: businessName "AI Solutions Barbados", email "jp@aisolutionsbb.com")
- 1 demo user linked to it
- 3 demo invoices spanning the last 90 days

This makes the local dev environment usable immediately.
