// Phase 1A: log the magic link to the server console so dev can paste it in.
// Phase 1B: wire SendGrid (SENDGRID_API_KEY + EMAIL_FROM) and remove the console fallback.
export async function sendMagicLink(email: string, url: string): Promise<void> {
  if (process.env.SENDGRID_API_KEY) {
    await sendViaSendGrid(email, url);
    return;
  }
  console.log("\n=== MAGIC LINK (Phase 1A — no live email) ===");
  console.log(`To:   ${email}`);
  console.log(`Link: ${url}`);
  console.log("==============================================\n");
}

async function sendViaSendGrid(email: string, url: string): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM not configured");

  const fromMatch = from.match(/^(.*)<(.+)>$/);
  const fromEmail = fromMatch ? fromMatch[2].trim() : from.trim();
  const fromName = fromMatch ? fromMatch[1].trim().replace(/^"|"$/g, "") : "AISB Invoicer";

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: fromEmail, name: fromName },
      subject: "Sign in to AISB Invoicer",
      content: [
        {
          type: "text/plain",
          value: `Click to sign in: ${url}\n\nLink expires in 10 minutes.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid send failed: ${res.status} ${body}`);
  }
}
