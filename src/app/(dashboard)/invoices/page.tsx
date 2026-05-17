import Link from "next/link";
import { withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await withTenant(async ({ db, tenantId }) => {
    return db.invoice.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        number: true,
        issueDate: true,
        toName: true,
        total: true,
        currency: true,
        status: true,
        items: true,
      },
    });
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link href="/invoices/new" className="btn-primary">New invoice</Link>
      </div>

      {invoices.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-ink-300 mb-4">No invoices yet.</p>
          <Link href="/invoices/new" className="btn-primary inline-block">Create your first invoice</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-700 text-ink-300 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold text-right">Items</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const itemCount = Array.isArray(inv.items) ? inv.items.length : 0;
                return (
                  <tr key={inv.id} className="border-t border-ink-700">
                    <td className="px-4 py-3 font-mono">{inv.number}</td>
                    <td className="px-4 py-3 text-ink-300">
                      {new Date(inv.issueDate).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">{inv.toName}</td>
                    <td className="px-4 py-3 text-right text-ink-300">{itemCount}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {inv.currency} {Number(inv.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-ink-700 text-ink-200">{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-green hover:underline mr-3"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
