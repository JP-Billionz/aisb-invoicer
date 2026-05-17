import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description required").max(500),
  qty: z.number().positive("Qty must be positive"),
  rate: z.number().nonnegative("Rate must be ≥ 0"),
});

export const createInvoiceSchema = z.object({
  issueDate: z.string().datetime().or(z.string().min(1)),
  dueDate: z.string().datetime().or(z.string().min(1)).optional().nullable(),
  currency: z.string().min(3).max(3),

  toName: z.string().min(1, "Customer name required").max(200),
  toAddress: z.string().max(500).optional().nullable(),
  toEmail: z.string().email().optional().or(z.literal("")).nullable(),
  toPhone: z.string().max(50).optional().nullable(),

  items: z.array(lineItemSchema).min(1, "At least one line item required"),

  vatApplied: z.boolean().default(false),
  vatRate: z.number().min(0).max(100).default(0),

  notes: z.string().max(2000).optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;

export function computeTotals(items: LineItem[], vatApplied: boolean, vatRate: number) {
  const subtotal = items.reduce((acc, it) => acc + it.qty * it.rate, 0);
  const effectiveVatRate = vatApplied ? vatRate : 0;
  const vatAmount = +(subtotal * (effectiveVatRate / 100)).toFixed(2);
  const total = +(subtotal + vatAmount).toFixed(2);
  return {
    subtotal: +subtotal.toFixed(2),
    vatRate: effectiveVatRate,
    vatAmount,
    total,
  };
}
