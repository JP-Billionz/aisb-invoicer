import { auth } from "./auth";
import { prisma } from "./db";
import type { PrismaClient } from "@prisma/client";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  db: PrismaClient;
}

/**
 * Wrap every DB access in withTenant — the only sanctioned way to read
 * or write tenant-owned data. The handler receives a ctx with the
 * authenticated user's tenantId; any query inside MUST scope to it.
 */
export async function withTenant<T>(
  fn: (ctx: TenantContext) => Promise<T>,
): Promise<T> {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) {
    throw new UnauthorizedError();
  }
  return fn({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    db: prisma,
  });
}
