import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withTenant, UnauthorizedError } from "@/lib/tenant";
import { createInvoiceSchema, computeTotals } from "@/lib/validation";
import { canCreateInvoices } from "@/lib/plans";

export const dynamic = "force-dynamic";

class TrialOrSubscriptionRequiredError extends Error {
  constructor() {
    super("Trial expired and no active subscription");
    this.name = "TrialOrSubscriptionRequiredError";
  }
}

export async function GET() {
  try {
    const invoices = await withTenant(({ db, tenantId }) =>
      db.invoice.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    );
    return NextResponse.json({ invoices });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createInvoiceSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const totals = computeTotals(input.items, input.vatApplied, input.vatRate);

  try {
    const invoice = await withTenant(async ({ db, tenantId }) => {
      return db.$transaction(async (tx) => {
        const tenant = await tx.tenant.findUnique({
          where: { id: tenantId },
          select: {
            businessName: true,
            address: true,
            email: true,
            phone: true,
            nextInvoiceNumber: true,
            subscriptionStatus: true,
            trialEndsAt: true,
          },
        });
        if (!tenant) throw new Error("Tenant missing");
        if (!canCreateInvoices(tenant)) {
          throw new TrialOrSubscriptionRequiredError();
        }

        const updated = await tx.tenant.update({
          where: { id: tenantId },
          data: { nextInvoiceNumber: { increment: 1 } },
          select: { nextInvoiceNumber: true },
        });
        const number = updated.nextInvoiceNumber - 1;

        return tx.invoice.create({
          data: {
            tenantId,
            number,
            issueDate: new Date(input.issueDate),
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            currency: input.currency,
            fromName: tenant.businessName,
            fromAddress: tenant.address,
            fromEmail: tenant.email,
            fromPhone: tenant.phone,
            toName: input.toName,
            toAddress: input.toAddress ?? null,
            toEmail: input.toEmail ?? null,
            toPhone: input.toPhone ?? null,
            items: input.items as unknown as Prisma.JsonArray,
            subtotal: new Prisma.Decimal(totals.subtotal.toFixed(2)),
            vatRate: new Prisma.Decimal(totals.vatRate.toFixed(2)),
            vatAmount: new Prisma.Decimal(totals.vatAmount.toFixed(2)),
            total: new Prisma.Decimal(totals.total.toFixed(2)),
            vatApplied: input.vatApplied,
            notes: input.notes ?? null,
            status: "issued",
          },
        });
      });
    });

    return NextResponse.json({ id: invoice.id, number: invoice.number });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof TrialOrSubscriptionRequiredError) {
      return NextResponse.json(
        { error: "Trial expired. Subscribe to keep creating invoices.", code: "subscription_required" },
        { status: 402 },
      );
    }
    console.error("Invoice create failed", e);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
