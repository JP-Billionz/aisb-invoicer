import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, getWebhookSecret } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { planForPriceId } from "@/lib/plans";

// Webhook signature verification requires the raw body — disable Next's
// automatic body parsing. App Router gives us req.text() unparsed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe().webhooks.constructEvent(rawBody, signature, getWebhookSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown signature error";
    console.error("stripe/webhook signature verification failed", message);
    return NextResponse.json({ error: `Webhook signature failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await markCanceled(event.data.object as Stripe.Subscription);
        break;
      default:
        // Other events (checkout.session.completed, invoice.*) are
        // useful for analytics but don't need state changes — the
        // subscription.* events already cover everything we persist.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`stripe/webhook handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const tenantId = await resolveTenantId(sub);
  if (!tenantId) {
    console.warn(`stripe/webhook: no tenant for subscription ${sub.id}`);
    return;
  }

  const priceId = sub.items.data[0]?.price.id;
  const plan = priceId ? planForPriceId(priceId) : null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      ...(plan ? { subscriptionPlan: plan } : {}),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

async function markCanceled(sub: Stripe.Subscription): Promise<void> {
  const tenantId = await resolveTenantId(sub);
  if (!tenantId) return;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionStatus: "canceled",
      cancelAtPeriodEnd: false,
    },
  });
}

async function resolveTenantId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = sub.metadata?.tenantId;
  if (fromMetadata) return fromMetadata;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return tenant?.id ?? null;
}
