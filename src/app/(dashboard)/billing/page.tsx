import { withTenant } from "@/lib/tenant";
import { PLANS, PLAN_ORDER, subscriptionLabel, isPlanSlug } from "@/lib/plans";
import { SubscribeButton, ManageBillingButton } from "@/components/BillingActions";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { canceled?: string };
}) {
  const tenant = await withTenant(({ db, tenantId }) =>
    db.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        subscriptionStatus: true,
        subscriptionPlan: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true,
      },
    }),
  );

  const onActiveSub = tenant.subscriptionStatus === "active";
  const currentPlan = isPlanSlug(tenant.subscriptionPlan) ? tenant.subscriptionPlan : null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-ink-400 text-sm">
          {subscriptionLabel(tenant)}
          {tenant.currentPeriodEnd && tenant.subscriptionStatus === "active" && (
            <>
              {" · "}Renews {tenant.currentPeriodEnd.toLocaleDateString("en-GB")}
            </>
          )}
        </p>
        {searchParams.canceled === "1" && (
          <p className="text-sm text-amber-300">
            Checkout canceled — no charge was made.
          </p>
        )}
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((slug) => {
          const plan = PLANS[slug];
          const isCurrent = onActiveSub && currentPlan === slug;
          const highlight = slug === "growth";
          return (
            <div
              key={slug}
              className={
                "card p-6 flex flex-col gap-4 " +
                (highlight ? "border-brand-purple/60 shadow-[0_0_0_1px_rgba(124,58,237,0.3)]" : "")
              }
            >
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-bold">{plan.name}</h2>
                  {highlight && (
                    <span className="text-[10px] uppercase tracking-wider text-brand-purple font-semibold">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-400">{plan.tagline}</p>
              </div>
              <div className="text-3xl font-bold">
                BBD ${plan.priceMonthly}
                <span className="text-sm font-normal text-ink-400"> / mo</span>
              </div>
              <ul className="space-y-2 text-sm text-ink-200 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-brand-green">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-lg border border-brand-green/40 px-4 py-2.5 text-sm font-semibold text-brand-green"
                >
                  Current plan
                </button>
              ) : (
                <SubscribeButton
                  plan={slug}
                  highlight={highlight}
                  label={onActiveSub ? "Switch to this plan" : "Subscribe"}
                />
              )}
            </div>
          );
        })}
      </section>

      {tenant.stripeCustomerId && (
        <section className="card p-6">
          <h2 className="text-lg font-bold mb-2">Manage your subscription</h2>
          <p className="text-sm text-ink-400 mb-4">
            Open the Stripe Customer Portal to update your card, change plan, view invoices, or cancel.
          </p>
          <ManageBillingButton />
        </section>
      )}
    </div>
  );
}
