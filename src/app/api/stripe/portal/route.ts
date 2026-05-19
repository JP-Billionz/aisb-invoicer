import { NextResponse } from "next/server";
import { withTenant, UnauthorizedError } from "@/lib/tenant";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    return await withTenant(async ({ db, tenantId }) => {
      const tenant = await db.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { stripeCustomerId: true },
      });

      if (!tenant.stripeCustomerId) {
        return NextResponse.json(
          { error: "No Stripe customer on file. Subscribe first." },
          { status: 400 },
        );
      }

      const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL;
      const session = await stripe().billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${origin}/settings`,
      });

      return NextResponse.json({ url: session.url });
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("stripe/portal error", err);
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
