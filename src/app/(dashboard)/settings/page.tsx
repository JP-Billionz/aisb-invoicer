import { withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const tenant = await withTenant(({ db, tenantId }) =>
    db.tenant.findUnique({ where: { id: tenantId } }),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="card p-6 space-y-4 text-sm">
        <div><span className="text-ink-400">Business name:</span> <span className="ml-2">{tenant?.businessName}</span></div>
        <div><span className="text-ink-400">Email:</span> <span className="ml-2">{tenant?.email}</span></div>
        <div><span className="text-ink-400">Default currency:</span> <span className="ml-2">{tenant?.defaultCurrency}</span></div>
        <div><span className="text-ink-400">Default VAT rate:</span> <span className="ml-2">{String(tenant?.defaultVatRate)}%</span></div>
        <div><span className="text-ink-400">Next invoice #:</span> <span className="ml-2 font-mono">{tenant?.nextInvoiceNumber}</span></div>
        <div><span className="text-ink-400">Subscription:</span> <span className="ml-2">{tenant?.subscriptionStatus} / {tenant?.subscriptionPlan}</span></div>
        <p className="text-ink-400 text-xs pt-4 border-t border-ink-700">
          Phase 1A: settings are read-only in the UI. Editable form lands in Phase 1B alongside Stripe billing and tenant invites.
        </p>
      </div>
    </div>
  );
}
