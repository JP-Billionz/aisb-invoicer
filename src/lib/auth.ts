import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import { sendMagicLink } from "./email";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
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
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const tenant = await prisma.tenant.create({
        data: {
          businessName: user.email.split("@")[0],
          email: user.email,
          subscriptionStatus: "trialing",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id, role: "owner" },
      });
    },
  },
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
