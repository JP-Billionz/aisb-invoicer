import { NextResponse } from "next/server";
import { withTenant, UnauthorizedError } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const invoice = await withTenant(({ db, tenantId }) =>
      db.invoice.findFirst({ where: { id: params.id, tenantId, deletedAt: null } }),
    );
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ invoice });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await withTenant(({ db, tenantId }) =>
      db.invoice.updateMany({
        where: { id: params.id, tenantId, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    );
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
}
