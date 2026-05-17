export default function CheckEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">Check your email</h1>
        <p className="text-ink-300 mb-6">
          We sent you a magic link. Click it to sign in. The link expires in 10 minutes.
        </p>
        <p className="text-ink-400 text-sm">
          <strong>Phase 1A note:</strong> live email send is wired in Phase 1B. For now
          the link is written to the server console — check the Render logs (or your dev
          terminal locally) and paste the URL into your browser.
        </p>
      </div>
    </main>
  );
}
