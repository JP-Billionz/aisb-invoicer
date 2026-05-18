// Sends the magic-link sign-in email.
// - If SENDGRID_API_KEY is set: live send via SendGrid REST API (production).
// - Otherwise: log the link to the server console (Phase 1A dev fallback).
export async function sendMagicLink(email: string, url: string): Promise<void> {
  if (process.env.SENDGRID_API_KEY) {
    await sendViaSendGrid(email, url);
    return;
  }
  console.log("\n=== MAGIC LINK (no SENDGRID_API_KEY — dev fallback) ===");
  console.log(`To:   ${email}`);
  console.log(`Link: ${url}`);
  console.log("=======================================================\n");
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
        { type: "text/plain", value: textBody(url) },
        { type: "text/html", value: htmlBody(url) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid send failed: ${res.status} ${body}`);
  }
}

function textBody(url: string): string {
  return [
    "Sign in to AISB Invoicer",
    "",
    "Click the link below to sign in. The link expires in 10 minutes and can only be used once.",
    "",
    url,
    "",
    "If you didn't request this, you can safely ignore this email.",
    "",
    "— AI Solutions Barbados",
  ].join("\n");
}

function htmlBody(url: string): string {
  // Inlined styles — many email clients strip <style>.
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0b0b12;font-family:Helvetica,Arial,sans-serif;color:#e6e6f0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b12;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#15151f;border-radius:12px;overflow:hidden;">
        <tr><td style="height:6px;background:linear-gradient(90deg,#39D353 0%,#39D353 33%,#7C3AED 33%,#7C3AED 66%,#39D353 66%,#39D353 100%);"></td></tr>
        <tr><td style="padding:32px 40px 24px;">
          <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;font-weight:700;">Sign in to AISB Invoicer</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#c9c9d6;">
            Click the button below to sign in. The link expires in 10 minutes and can only be used once.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${url}" style="display:inline-block;background:#7C3AED;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">Sign in</a>
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#6b6b82;">If the button doesn't work, paste this URL into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#c9c9d6;word-break:break-all;">${url}</p>
          <p style="margin:0;font-size:12px;color:#6b6b82;">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px 40px 24px;border-top:1px solid #25252f;font-size:11px;color:#6b6b82;">
          Powered by AI Solutions Barbados
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
