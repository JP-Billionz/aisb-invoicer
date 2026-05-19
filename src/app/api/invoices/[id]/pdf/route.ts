import { NextResponse } from "next/server";
import { withTenant, UnauthorizedError } from "@/lib/tenant";
import { renderInvoicePdf } from "@/lib/pdf";
import { PLANS, isPlanSlug } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await withTenant(async ({ db, tenantId }) => {
      const invoice = await db.invoice.findFirst({
        where: { id: params.id, tenantId, deletedAt: null },
      });
      if (!invoice) return null;
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { invoiceNumberPrefix: true, subscriptionPlan: true },
      });
      return {
        invoice,
        prefix: tenant?.invoiceNumberPrefix ?? null,
        plan: tenant?.subscriptionPlan ?? "starter",
      };
    });

    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { invoice, prefix, plan } = result;
    const showPoweredByFooter = isPlanSlug(plan) ? PLANS[plan].showsPoweredByFooter : true;

    const items = (invoice.items as { description: string; qty: number; rate: number }[]) ?? [];
    const pdf = renderInvoicePdf({
      number: invoice.number,
      prefix,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      from: {
        name: invoice.fromName,
        address: invoice.fromAddress,
        email: invoice.fromEmail,
        phone: invoice.fromPhone,
      },
      to: {
        name: invoice.toName,
        address: invoice.toAddress,
        email: invoice.toEmail,
        phone: invoice.toPhone,
      },
      items,
      subtotal: Number(invoice.subtotal),
      vatRate: Number(invoice.vatRate),
      vatAmount: Number(invoice.vatAmount),
      total: Number(invoice.total),
      vatApplied: invoice.vatApplied,
      notes: invoice.notes,
      showPoweredByFooter,
    });

    const filename = `AISB_Invoice_${prefix ?? ""}${invoice.number}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("PDF render failed", e);
    return NextResponse.json({ error: "Failed to render PDF" }, { status: 500 });
  }
}
