import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: { email: "jp@aisolutionsbb.com" },
    include: { tenant: true },
  });

  const tenant =
    existingUser?.tenant ??
    (await prisma.tenant.create({
      data: {
        businessName: "AI Solutions Barbados",
        email: "jp@aisolutionsbb.com",
        address: "Bridgetown, Barbados",
        phone: "+1 246 000 0000",
        defaultCurrency: "BBD",
        defaultVatRate: new Prisma.Decimal("17.5"),
        nextInvoiceNumber: 10027,
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    }));

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: "jp@aisolutionsbb.com",
        name: "Jamai",
        tenantId: tenant.id,
        role: "owner",
      },
    });
  }

  const existingInvoiceCount = await prisma.invoice.count({ where: { tenantId: tenant.id } });
  if (existingInvoiceCount > 0) {
    console.log(`Seed: tenant ${tenant.id} already has ${existingInvoiceCount} invoices, skipping sample invoices.`);
    return;
  }

  const samples = [
    {
      toName: "Blue Horizon Hotel",
      toEmail: "ap@bluehorizon.bb",
      days: 75,
      items: [
        { description: "Website redesign — discovery phase", qty: 1, rate: 4500 },
        { description: "Brand audit", qty: 1, rate: 1200 },
      ],
    },
    {
      toName: "Coral Reef Imports Ltd.",
      toEmail: "finance@coralreef.bb",
      days: 40,
      items: [
        { description: "Inventory dashboard build", qty: 1, rate: 6800 },
        { description: "Staff training session", qty: 2, rate: 450 },
      ],
    },
    {
      toName: "Pelican Bay Bistro",
      toEmail: "owner@pelicanbay.bb",
      days: 10,
      items: [{ description: "POS integration", qty: 1, rate: 2200 }],
    },
  ];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const subtotal = s.items.reduce((acc, it) => acc + it.qty * it.rate, 0);
    const vatRate = 17.5;
    const vatAmount = +(subtotal * (vatRate / 100)).toFixed(2);
    const total = +(subtotal + vatAmount).toFixed(2);

    await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        number: 10027 + i,
        issueDate: new Date(Date.now() - s.days * 24 * 60 * 60 * 1000),
        currency: "BBD",
        fromName: tenant.businessName,
        fromAddress: tenant.address,
        fromEmail: tenant.email,
        fromPhone: tenant.phone,
        toName: s.toName,
        toEmail: s.toEmail,
        items: s.items,
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        vatRate: new Prisma.Decimal(vatRate.toFixed(2)),
        vatAmount: new Prisma.Decimal(vatAmount.toFixed(2)),
        total: new Prisma.Decimal(total.toFixed(2)),
        vatApplied: true,
        status: "issued",
      },
    });
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { nextInvoiceNumber: 10027 + samples.length },
  });

  console.log(`Seed complete. Tenant ${tenant.id}, ${samples.length} invoices.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
