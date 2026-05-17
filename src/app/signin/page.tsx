import { signIn } from "@/lib/auth";

export default function SignInPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Sign in</h1>
        <p className="text-ink-300 text-sm mb-6">
          We'll email you a magic link. No password needed.
        </p>

        {searchParams.error ? (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-200 text-sm">
            Couldn't send the link. Try again.
          </div>
        ) : null}

        <form
          action={async (formData) => {
            "use server";
            await signIn("email", { email: formData.get("email") as string, redirectTo: "/invoices" });
          }}
          className="space-y-4"
        >
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              required
              type="email"
              name="email"
              id="email"
              placeholder="you@business.com"
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary w-full">Send magic link</button>
        </form>

        <p className="text-ink-400 text-xs mt-6 text-center">
          Phase 1A: live email is off. The magic link prints to the server console.
        </p>
      </div>
    </main>
  );
}
