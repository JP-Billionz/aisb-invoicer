import Stripe from "stripe";

let cached: Stripe | null = null;

/**
 * Singleton Stripe client. Throws at call time (not import time) if
 * STRIPE_SECRET_KEY is missing, so unrelated routes still build.
 */
export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  cached = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cached;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return secret;
}

/**
 * Map Stripe's subscription.status to the value we store on Tenant.
 * We persist Stripe's vocabulary verbatim — easier to debug, no mapping
 * drift when Stripe adds new statuses.
 */
export function normalizeStatus(status: Stripe.Subscription.Status): string {
  return status;
}
