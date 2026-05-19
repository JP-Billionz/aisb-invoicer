import { NextResponse } from "next/server";
import { withTenant, UnauthorizedError } from "@/lib/tenant";
import { stripe } from "@/lib/stripe";
import { PLANS, isPlanSlug } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    return await withTenant(async ({ db, tenantId }) => {
      const { plan } = (await req.json()) as { plan?: unknown };
      if (typeof plan !== "string" || !isPlanSlug(plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      const priceId = process.env[PLANS[plan].priceIdEnv];
      if (!priceId) {
        return NextResponse.json(
          { error: `Price ID for ${plan} not configured` },
          { status: 500 },
        );
      }

      const tenant = await db.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: {
          id: true,
          email: true,
          businessName: true,
          stripeCustomerId: true,
        },
      });

      // Create the Stripe customer lazily on the first checkout attempt
      // so trialing tenants don't pollute Stripe with empty records.
      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe().customers.create({
          email: tenant.email,
          name: tenant.businessName,
          metadata: { tenantId: tenant.id },
        });
        customerId = customer.id;
        await db.tenant.update({
          where: { id: tenantId },
          data: { stripeCustomerId: customerId },
        });
      }

      const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL;
      const session = await stripe().checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/settings?billing=success`,
        cancel_url: `${origin}/billing?canceled=1`,
        allow_promotion_codes: true,
        subscription_data: {
          metadata: { tenantId: tenant.id, plan },
        },
        client_reference_id: tenant.id,
      });

      return NextResponse.json({ url: session.url });
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("stripe/checkout error", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
