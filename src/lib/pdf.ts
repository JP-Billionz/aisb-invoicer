import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoicePdfData {
  number: number;
  prefix?: string | null;
  issueDate: Date;
  dueDate?: Date | null;
  currency: string;

  from: { name: string; address?: string | null; email?: string | null; phone?: string | null };
  to: { name: string; address?: string | null; email?: string | null; phone?: string | null };

  items: { description: string; qty: number; rate: number }[];

  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  vatApplied: boolean;

  notes?: string | null;
}

const BRAND_PURPLE = [124, 58, 237] as const;
const BRAND_GREEN = [57, 211, 83] as const;
const LAVENDER = [232, 222, 255] as const;
const INK_900 = [11, 11, 18] as const;
const INK_400 = [107, 107, 130] as const;
const INK_200 = [201, 201, 214] as const;

const fmt = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });

export function renderInvoicePdf(data: InvoicePdfData): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Lavender header band
  doc.setFillColor(...LAVENDER);
  doc.rect(0, 0, pageW, 130, "F");

  // Green-purple-green accent strip
  const stripY = 130;
  const stripH = 6;
  const third = pageW / 3;
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, stripY, third, stripH, "F");
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(third, stripY, third, stripH, "F");
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(third * 2, stripY, third, stripH, "F");

  // Header content
  doc.setTextColor(...INK_900);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("INVOICE", margin, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK_400);
  doc.text(data.from.name, margin, 82);
  if (data.from.address) doc.text(data.from.address, margin, 96);
  const fromContact = [data.from.email, data.from.phone].filter(Boolean).join("  •  ");
  if (fromContact) doc.text(fromContact, margin, 110);

  const invoiceLabel = `${data.prefix ?? ""}${data.number}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK_900);
  const numText = `#${invoiceLabel}`;
  const numW = doc.getTextWidth(numText);
  doc.text(numText, pageW - margin - numW, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK_400);
  const issued = `Issued  ${fmtDate(data.issueDate)}`;
  doc.text(issued, pageW - margin - doc.getTextWidth(issued), 82);
  if (data.dueDate) {
    const due = `Due     ${fmtDate(data.dueDate)}`;
    doc.text(due, pageW - margin - doc.getTextWidth(due), 96);
  }

  // Bill-to block
  let y = 180;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK_400);
  doc.text("BILL TO", margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK_900);
  y += 18;
  doc.text(data.to.name, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK_400);
  if (data.to.address) {
    y += 14;
    doc.text(data.to.address, margin, y);
  }
  const toContact = [data.to.email, data.to.phone].filter(Boolean).join("  •  ");
  if (toContact) {
    y += 14;
    doc.text(toContact, margin, y);
  }

  // Items table
  const tableStartY = y + 28;
  autoTable(doc, {
    startY: tableStartY,
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: data.items.map((it) => [
      it.description,
      it.qty.toString(),
      fmt(it.rate, data.currency),
      fmt(it.qty * it.rate, data.currency),
    ]),
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 10, textColor: [...INK_900] as [number, number, number], cellPadding: 8 },
    headStyles: {
      fillColor: [...BRAND_PURPLE] as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 247, 252] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 50, halign: "right" },
      2: { cellWidth: 90, halign: "right" },
      3: { cellWidth: 100, halign: "right" },
    },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Totals block
  let ty = afterTable + 20;
  const totalsLabelX = pageW - margin - 200;
  const totalsValueX = pageW - margin;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK_400);
  doc.text("Subtotal", totalsLabelX, ty);
  doc.setTextColor(...INK_900);
  const subStr = fmt(data.subtotal, data.currency);
  doc.text(subStr, totalsValueX - doc.getTextWidth(subStr), ty);

  if (data.vatApplied && data.vatAmount > 0) {
    ty += 16;
    doc.setTextColor(...INK_400);
    doc.text(`VAT (${data.vatRate}%)`, totalsLabelX, ty);
    doc.setTextColor(...INK_900);
    const vatStr = fmt(data.vatAmount, data.currency);
    doc.text(vatStr, totalsValueX - doc.getTextWidth(vatStr), ty);
  }

  ty += 12;
  doc.setDrawColor(...INK_200);
  doc.line(totalsLabelX, ty, totalsValueX, ty);

  ty += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_PURPLE);
  doc.text("TOTAL", totalsLabelX, ty);
  const totalStr = fmt(data.total, data.currency);
  doc.text(totalStr, totalsValueX - doc.getTextWidth(totalStr), ty);

  // Notes
  if (data.notes) {
    const ny = Math.max(ty + 40, afterTable + 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK_400);
    doc.text("NOTES", margin, ny);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK_900);
    const wrapped = doc.splitTextToSize(data.notes, pageW - margin * 2);
    doc.text(wrapped, margin, ny + 14);
  }

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...INK_400);
  const footer = "Powered by AI Solutions Barbados";
  doc.text(footer, pageW / 2 - doc.getTextWidth(footer) / 2, pageH - 24);

  return new Uint8Array(doc.output("arraybuffer"));
}
