import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateInvoices } from "@/lib/plans";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/signin");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { businessName: true, subscriptionStatus: true, trialEndsAt: true },
  });

  const daysLeft = tenant?.trialEndsAt
    ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const canCreate = tenant ? canCreateInvoices(tenant) : false;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-ink-700 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/invoices" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded brand-gradient" />
            <span className="font-bold">AISB Invoicer</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/invoices" className="text-ink-300 hover:text-ink-100">Invoices</Link>
            <Link href="/invoices/new" className="text-ink-300 hover:text-ink-100">New invoice</Link>
            <Link href="/billing" className="text-ink-300 hover:text-ink-100">Billing</Link>
            <Link href="/settings" className="text-ink-300 hover:text-ink-100">Settings</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-400">{tenant?.businessName}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="text-ink-300 hover:text-ink-100">Sign out</button>
          </form>
        </div>
      </header>

      {tenant?.subscriptionStatus === "trialing" && daysLeft > 0 && (
        <div className="bg-brand-purple/20 border-b border-brand-purple/40 px-6 py-2 text-sm text-center">
          {daysLeft} day{daysLeft === 1 ? "" : "s"} left in trial.{" "}
          <Link href="/billing" className="font-semibold text-brand-purple hover:underline">
            Subscribe now
          </Link>
        </div>
      )}
      {!canCreate && tenant && (
        <div className="bg-red-500/20 border-b border-red-500/40 px-6 py-2 text-sm text-center">
          {tenant.subscriptionStatus === "trialing"
            ? "Your trial has ended. Existing invoices remain available; new invoice creation is locked until you subscribe."
            : "Your subscription is not active. New invoice creation is locked until billing is restored."}{" "}
          <Link href="/billing" className="font-semibold text-red-200 underline">
            Open billing
          </Link>
        </div>
      )}

      <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  );
}
