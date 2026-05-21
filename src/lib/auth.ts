import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "@auth/core/adapters";
import { prisma } from "./db";
import { sendMagicLink } from "./email";

const TRIAL_DAYS = 14;

function deriveTenantName(email: string): string {
  const domain = email.split("@")[1];
  const root = domain?.split(".")[0];
  if (!root) return email;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

// Auth.js's PrismaAdapter ships a default createUser that writes only
// { email, emailVerified } — which Prisma rejects because User.tenantId
// is required (NOT NULL) and has no default. Self-serve signup = a brand
// new Tenant per email, so we override createUser to provision the
// Tenant first and link the User to it in one transaction.
const baseAdapter = PrismaAdapter(prisma);

const adapter: Adapter = {
  ...baseAdapter,
  async createUser(data: AdapterUser): Promise<AdapterUser> {
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const user = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          businessName: deriveTenantName(data.email),
          email: data.email,
          subscriptionStatus: "trialing",
          trialEndsAt,
          // nextInvoiceNumber defaults to 10027 in the schema.
        },
      });
      return tx.user.create({
        data: {
          email: data.email,
          emailVerified: data.emailVerified,
          name: data.name,
          image: data.image,
          tenantId: tenant.id,
          role: "owner",
        },
      });
    });
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      image: user.image,
    };
  },
};

export const authConfig: NextAuthConfig = {
  adapter,
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check-email",
  },
  providers: [
    {
      id: "email",
      type: "email",
      name: "Email",
      maxAge: 10 * 60,
      from: process.env.EMAIL_FROM ?? "noreply@localhost",
      server: {},
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLink(identifier, url);
      },
      options: {},
    },
  ],
  callbacks: {
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { tenantId: true, role: true },
      });
      if (dbUser) {
        session.user.id = user.id;
        session.user.tenantId = dbUser.tenantId;
        session.user.role = dbUser.role;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
