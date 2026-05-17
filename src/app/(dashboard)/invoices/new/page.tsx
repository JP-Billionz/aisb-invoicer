import { redirect } from "next/navigation";
import NewInvoiceForm from "@/components/NewInvoiceForm";
import { withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const tenant = await withTenant(async ({ db, tenantId }) => {
    return db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        businessName: true,
        address: true,
        email: true,
        phone: true,
        defaultCurrency: true,
        defaultVatRate: true,
        invoiceNumberPrefix: true,
        nextInvoiceNumber: true,
        defaultNotes: true,
      },
    });
  });

  if (!tenant) redirect("/signin");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New invoice</h1>
      <NewInvoiceForm
        nextNumber={tenant.nextInvoiceNumber}
        prefix={tenant.invoiceNumberPrefix ?? ""}
        from={{
          name: tenant.businessName,
          address: tenant.address ?? "",
          email: tenant.email,
          phone: tenant.phone ?? "",
        }}
        defaultCurrency={tenant.defaultCurrency}
        defaultVatRate={Number(tenant.defaultVatRate)}
        defaultNotes={tenant.defaultNotes ?? ""}
      />
    </div>
  );
}
