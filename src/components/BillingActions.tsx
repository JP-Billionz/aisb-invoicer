"use client";

import { useState } from "react";
import type { PlanSlug } from "@/lib/plans";

export function SubscribeButton({
  plan,
  highlight,
  label,
}: {
  plan: PlanSlug;
  highlight?: boolean;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className={
          "w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 " +
          (highlight
            ? "bg-brand-purple text-white hover:bg-brand-purple/90"
            : "border border-ink-600 text-ink-100 hover:border-brand-purple")
        }
      >
        {pending ? "Loading…" : (label ?? "Subscribe")}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Portal failed");
      }
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="rounded-lg border border-ink-600 px-4 py-2 text-sm hover:border-brand-purple disabled:opacity-60"
      >
        {pending ? "Loading…" : "Manage billing"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
