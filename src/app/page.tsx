import Link from "next/link";

export default function MarketingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ink-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg brand-gradient" />
          <span className="font-bold text-lg">AISB Invoicer</span>
        </div>
        <Link href="/signin" className="btn-secondary">Sign in</Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Branded invoices.{" "}
            <span className="bg-gradient-to-r from-brand-purple to-brand-green bg-clip-text text-transparent">
              In under a minute.
            </span>
          </h1>
          <p className="text-ink-300 text-lg mb-10">
            Multi-tenant invoicing built for Caribbean small businesses. Clean
            PDFs, per-tenant numbering, no nonsense.
          </p>
          <Link href="/signin" className="btn-primary inline-block">
            Start free trial
          </Link>
          <p className="text-ink-400 text-sm mt-4">14 days, no card required.</p>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-sm text-ink-400 border-t border-ink-700">
        Powered by AI Solutions Barbados
      </footer>
    </main>
  );
}
