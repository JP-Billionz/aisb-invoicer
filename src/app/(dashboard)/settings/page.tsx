import Link from "next/link";
import { withTenant } from "@/lib/tenant";
import { subscriptionLabel } from "@/lib/plans";
import { ManageBillingButton } from "@/components/BillingActions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { billing?: string };
}) {
  const tenant = await withTenant(({ db, tenantId }) =>
    db.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {searchParams.billing === "success" && (
        <div className="card border-brand-green/40 p-4 text-sm">
          Subscription updated — thanks. The change will sync within a few seconds via Stripe webhook.
        </div>
      )}

      <div className="card p-6 space-y-3 text-sm">
        <h2 className="text-lg font-bold mb-2">Business</h2>
        <Row label="Business name" value={tenant.businessName} />
        <Row label="Email" value={tenant.email} />
        <Row label="Default currency" value={tenant.defaultCurrency} />
        <Row label="Default VAT rate" value={`${String(tenant.defaultVatRate)}%`} />
        <Row label="Next invoice #" value={String(tenant.nextInvoiceNumber)} mono />
        <p className="text-ink-400 text-xs pt-3 border-t border-ink-700">
          Editable form lands in a follow-up. For now, paste changes to Jamai.
        </p>
      </div>

      <div className="card p-6 space-y-3 text-sm">
        <h2 className="text-lg font-bold mb-2">Subscription</h2>
        <Row label="Status" value={subscriptionLabel(tenant)} />
        <Row label="Plan" value={tenant.subscriptionPlan} />
        {tenant.currentPeriodEnd && (
          <Row
            label={tenant.cancelAtPeriodEnd ? "Cancels on" : "Renews"}
            value={tenant.currentPeriodEnd.toLocaleDateString("en-GB")}
          />
        )}
        <div className="flex gap-2 pt-3 border-t border-ink-700">
          <Link
            href="/billing"
            className="rounded-lg border border-ink-600 px-4 py-2 hover:border-brand-purple"
          >
            View plans
          </Link>
          {tenant.stripeCustomerId && <ManageBillingButton />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-ink-400">{label}:</span>
      <span className={"ml-2 " + (mono ? "font-mono" : "")}>{value}</span>
    </div>
  );
}
