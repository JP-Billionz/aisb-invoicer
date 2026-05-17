"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

interface Props {
  nextNumber: number;
  prefix: string;
  from: { name: string; address: string; email: string; phone: string };
  defaultCurrency: string;
  defaultVatRate: number;
  defaultNotes: string;
}

const CURRENCIES = ["BBD", "USD", "EUR", "GBP", "TTD"];

export default function NewInvoiceForm({
  nextNumber,
  prefix,
  from,
  defaultCurrency,
  defaultVatRate,
  defaultNotes,
}: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);

  const [toName, setToName] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toPhone, setToPhone] = useState("");

  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, rate: 0 }]);
  const [vatApplied, setVatApplied] = useState(false);
  const [vatRate, setVatRate] = useState(defaultVatRate);
  const [notes, setNotes] = useState(defaultNotes);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
    const effective = vatApplied ? vatRate : 0;
    const vatAmount = +(subtotal * (effective / 100)).toFixed(2);
    const total = +(subtotal + vatAmount).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), vatAmount, total };
  }, [items, vatApplied, vatRate]);

  const updateItem = (i: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { description: "", qty: 1, rate: 0 }]);
  const removeItem = (i: number) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueDate,
          dueDate: dueDate || null,
          currency,
          toName,
          toAddress: toAddress || null,
          toEmail: toEmail || null,
          toPhone: toPhone || null,
          items: items.map((it) => ({
            description: it.description,
            qty: Number(it.qty),
            rate: Number(it.rate),
          })),
          vatApplied,
          vatRate: Number(vatRate),
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { id } = await res.json();
      window.open(`/api/invoices/${id}/pdf`, "_blank");
      router.push("/invoices");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save invoice");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Invoice #</label>
            <input className="input" value={`${prefix}${nextNumber}`} readOnly />
          </div>
          <div>
            <label className="label">Issue date</label>
            <input className="input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Due date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-3 text-ink-300">From</h2>
          <p className="text-sm text-ink-400 mb-2">Auto-filled from settings (snapshotted at save).</p>
          <div className="text-sm space-y-1">
            <div className="font-semibold text-ink-100">{from.name}</div>
            {from.address && <div className="text-ink-300">{from.address}</div>}
            {(from.email || from.phone) && (
              <div className="text-ink-400">{[from.email, from.phone].filter(Boolean).join(" • ")}</div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-3 text-ink-300">Bill to</h2>
          <div className="space-y-3">
            <input className="input" placeholder="Customer name *" value={toName} onChange={(e) => setToName(e.target.value)} />
            <input className="input" placeholder="Address" value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
              <input className="input" placeholder="Phone" value={toPhone} onChange={(e) => setToPhone(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink-300">Line items</h2>
          <button type="button" className="btn-secondary" onClick={addItem}>+ Add item</button>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <input
                className="input col-span-6"
                placeholder="Description"
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <input
                className="input col-span-1"
                type="number"
                min={0}
                step="any"
                value={it.qty}
                onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
              />
              <input
                className="input col-span-2"
                type="number"
                min={0}
                step="any"
                value={it.rate}
                onChange={(e) => updateItem(i, { rate: Number(e.target.value) })}
              />
              <div className="col-span-2 text-right py-2 text-ink-200 font-mono">
                {((Number(it.qty) || 0) * (Number(it.rate) || 0)).toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                className="col-span-1 text-ink-400 hover:text-red-400 disabled:opacity-30 py-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-3 text-ink-300">Notes</h2>
          <textarea
            className="input min-h-[120px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, thank-you, etc."
          />
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-3 text-ink-300">Totals</h2>
          <div className="flex items-center gap-3 mb-3">
            <input
              id="vat"
              type="checkbox"
              checked={vatApplied}
              onChange={(e) => setVatApplied(e.target.checked)}
            />
            <label htmlFor="vat" className="text-sm">Apply VAT</label>
            <input
              className="input w-24 ml-auto"
              type="number"
              min={0}
              max={100}
              step="any"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              disabled={!vatApplied}
            />
            <span className="text-sm text-ink-400">%</span>
          </div>
          <div className="text-sm space-y-1 font-mono">
            <div className="flex justify-between"><span className="text-ink-400">Subtotal</span><span>{currency} {totals.subtotal.toFixed(2)}</span></div>
            {vatApplied && (
              <div className="flex justify-between"><span className="text-ink-400">VAT</span><span>{currency} {totals.vatAmount.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between text-lg pt-2 border-t border-ink-700 mt-2"><span className="text-brand-purple font-bold">TOTAL</span><span className="font-bold">{currency} {totals.total.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-red-700 bg-red-900/30 text-red-200 text-sm">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="button" className="btn-primary" disabled={submitting} onClick={submit}>
          {submitting ? "Saving…" : "Save & export PDF"}
        </button>
      </div>
    </div>
  );
}
