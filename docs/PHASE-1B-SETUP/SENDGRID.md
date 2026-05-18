# SendGrid setup — magic-link delivery

Phase 1B step 1. Until this is wired, magic links print to the Render
service logs and have to be copy-pasted by hand.

## What you need to do

### 1. Create the SendGrid account (5 min)

1. https://signup.sendgrid.com → sign up with `jamai@aisolutionsbb.com`
   (or whichever AISB email owns billing).
2. Verify the email, complete the onboarding.
3. Free tier allows 100 sends/day — enough for Phase 1B trials and the
   first founding customer.

### 2. Authenticate the sending domain (10 min, requires Cloudflare access)

This proves to mailbox providers that AISB is allowed to send from
`aisolutionsbb.com`. Without it, magic links land in spam.

1. SendGrid dashboard → **Settings** → **Sender Authentication** →
   **Authenticate Your Domain**.
2. DNS host: **Cloudflare**. Domain: `aisolutionsbb.com`. Use automated
   security: **Yes** (default).
3. SendGrid shows 3 CNAME records — copy them.
4. Cloudflare dashboard → `aisolutionsbb.com` → **DNS** → add the 3
   CNAMEs **with proxy status set to DNS only** (gray cloud, not orange).
   SendGrid validation fails through Cloudflare's proxy.
5. Back in SendGrid, click **Verify**. Should turn green within ~1 min.
   If it doesn't, double-check the proxy status and wait 5 min for DNS
   propagation.

### 3. Create the API key (2 min)

1. SendGrid dashboard → **Settings** → **API Keys** → **Create API Key**.
2. Name: `aisb-invoicer-production`.
3. Permissions: **Restricted Access** → enable **Mail Send: Full Access**.
   Everything else stays off (least privilege).
4. Copy the key (`SG.xxxx...`) — SendGrid only shows it once.

### 4. Paste into Render (2 min)

1. Render dashboard → `aisb-invoicer` Web Service → **Environment**.
2. Add (or update) `SENDGRID_API_KEY` → paste the key from step 3.
3. Confirm `EMAIL_FROM` is `AISB Invoicer <noreply@aisolutionsbb.com>`
   (set in `render.yaml`; should already be there).
4. Save changes → Render auto-redeploys (~2 min).

### 5. Smoke test (1 min)

1. Open https://aisb-invoicer.onrender.com/signin in an incognito window.
2. Enter your personal email (not jamai@aisolutionsbb.com — sending to
   the same domain you authenticated can hit auto-loopback issues).
3. Check inbox within ~30s. Click the magic-link button.
4. You should land authenticated in the dashboard.

If the email doesn't arrive:
- SendGrid dashboard → **Activity** → look for the send event.
  Green = delivered, yellow = deferred, red = bounced.
- Render service logs → search for `SendGrid send failed` — surfaces
  API-level errors (auth, scope, payload).

## How it works

- `src/lib/email.ts` checks `process.env.SENDGRID_API_KEY`. If set, it
  POSTs to `api.sendgrid.com/v3/mail/send` with branded HTML + text
  bodies. If not set, it logs the link to stdout (dev fallback only).
- `src/lib/auth.ts` calls `sendMagicLink` from the NextAuth email
  provider's `sendVerificationRequest` hook.
- No npm dependency — uses raw `fetch`. Keeps cold-start small.

## Cost note

Free tier (100 sends/day) covers Phase 1B comfortably. When we hit
~80 sends/day on average, upgrade to **Essentials** ($19.95/mo, 50k
sends/mo) — same API key, no code change.
