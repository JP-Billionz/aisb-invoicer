import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AISB Invoicer",
  description: "Multi-tenant SaaS invoicing platform by AI Solutions Barbados.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-900 text-ink-100 antialiased">{children}</body>
    </html>
  );
}
