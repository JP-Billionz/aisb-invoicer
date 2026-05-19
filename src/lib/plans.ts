// Plan metadata — single source of truth for Stripe-priced tiers.
// Soft tiers: every plan unlocks the full feature set; the only gates
// today are (a) "Powered by AI Solutions Barbados" footer on PDFs
// (Starter shows it, Growth/Pro can hide it) and (b) support level.

export type PlanSlug = "starter" | "growth" | "pro";

export interface Plan {
  slug: PlanSlug;
  name: string;
  priceMonthly: number; // BBD
  currency: "BBD";
  tagline: string;
  features: string[];
  /** When false, the PDF footer "Powered by AI Solutions Barbados" is removed. */
  showsPoweredByFooter: boolean;
  priceIdEnv: "STRIPE_PRICE_STARTER" | "STRIPE_PRICE_GROWTH" | "STRIPE_PRICE_PRO";
}

export const PLANS: Record<PlanSlug, Plan> = {
  starter: {
    slug: "starter",
    name: "Starter",
    priceMonthly: 29,
    currency: "BBD",
    tagline: "Get billing today.",
    features: [
      "Unlimited invoices",
      "PDF download",
      "Email magic-link sign-in",
      'PDF footer reads "Powered by AI Solutions Barbados"',
      "Community support",
    ],
    showsPoweredByFooter: true,
    priceIdEnv: "STRIPE_PRICE_STARTER",
  },
  growth: {
    slug: "growth",
    name: "Growth",
    priceMonthly: 59,
    currency: "BBD",
    tagline: "Look like your own brand.",
    features: [
      "Everything in Starter",
      'Remove "Powered by AI Solutions Barbados" footer',
      "Email support, 1-business-day SLA",
    ],
    showsPoweredByFooter: false,
    priceIdEnv: "STRIPE_PRICE_GROWTH",
  },
  pro: {
    slug: "pro",
    name: "Pro",
    priceMonthly: 99,
    currency: "BBD",
    tagline: "Priority everything.",
    features: [
      "Everything in Growth",
      "Priority email support, 4-business-hour SLA",
      "Early access to upcoming features",
    ],
    showsPoweredByFooter: false,
    priceIdEnv: "STRIPE_PRICE_PRO",
  },
};

export const PLAN_ORDER: PlanSlug[] = ["starter", "growth", "pro"];

export function isPlanSlug(value: string): value is PlanSlug {
  return value === "starter" || value === "growth" || value === "pro";
}

export function planForPriceId(priceId: string): PlanSlug | null {
  for (const slug of PLAN_ORDER) {
    if (process.env[PLANS[slug].priceIdEnv] === priceId) return slug;
  }
  return null;
}

/** True iff the tenant is allowed to create new invoices right now. */
export function canCreateInvoices(tenant: {
  subscriptionStatus: string;
  trialEndsAt: Date | null;
}): boolean {
  if (tenant.subscriptionStatus === "active") return true;
  if (
    tenant.subscriptionStatus === "trialing" &&
    tenant.trialEndsAt &&
    tenant.trialEndsAt.getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

/** Human-readable status for the dashboard banner. */
export function subscriptionLabel(tenant: {
  subscriptionStatus: string;
  subscriptionPlan: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}): string {
  if (tenant.subscriptionStatus === "trialing" && tenant.trialEndsAt) {
    const days = Math.max(
      0,
      Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86_400_000),
    );
    return days > 0 ? `Trial — ${days} day${days === 1 ? "" : "s"} left` : "Trial expired";
  }
  if (tenant.subscriptionStatus === "active") {
    const plan = isPlanSlug(tenant.subscriptionPlan)
      ? PLANS[tenant.subscriptionPlan].name
      : tenant.subscriptionPlan;
    if (tenant.cancelAtPeriodEnd && tenant.currentPeriodEnd) {
      return `${plan} — ends ${tenant.currentPeriodEnd.toLocaleDateString("en-GB")}`;
    }
    return `${plan} — active`;
  }
  return tenant.subscriptionStatus.replace(/_/g, " ");
}
