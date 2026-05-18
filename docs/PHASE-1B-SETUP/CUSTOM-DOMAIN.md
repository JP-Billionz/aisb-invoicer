# Custom domain — invoices.aisolutionsbb.com

Phase 1B step 2. Needs to land before Stripe webhooks go live so the
webhook URL is permanent from day one (changing it later means
re-creating the webhook endpoint in Stripe and risking missed events
during the cutover).

## CNAME target

The Render service is `aisb-invoicer.onrender.com` — that's also the
CNAME target for the custom domain. (Render's docs:
https://render.com/docs/custom-domains — for Web Services on Free or
Starter plans, CNAME to the service's `.onrender.com` hostname.)

If the Render dashboard shows a different "Target" string when you add
the custom domain in step 2 below, **use whatever Render shows you** —
that's the source of truth.

## What you need to do

### 1. Add the custom domain in Render (2 min)

1. Render dashboard → `aisb-invoicer` Web Service → **Settings** →
   **Custom Domains** → **Add Custom Domain**.
2. Enter `invoices.aisolutionsbb.com`.
3. Render shows a verification target — copy it. **This is the value
   you'll CNAME to.** Usually `aisb-invoicer.onrender.com` but
   confirm from the dashboard.

### 2. Add the CNAME in Cloudflare (2 min)

1. Cloudflare dashboard → `aisolutionsbb.com` → **DNS** → **Add record**.
2. Type: `CNAME`. Name: `invoices`. Target: the value from Render step 1.
3. **Proxy status: DNS only (gray cloud).** Render needs to terminate
   TLS itself; Cloudflare's proxy will break the cert challenge.
4. Save.

### 3. Wait for verification (~2 min)

Render polls DNS every ~30s. Within 2 min the Custom Domain entry
should flip from **Verifying** → **Available**. Render then requests
a Let's Encrypt cert; another 1–2 min to **Available** → **Active**.

If it stalls at Verifying for >5 min:
- `dig invoices.aisolutionsbb.com CNAME` (or use https://dnschecker.org)
  → should return the Render target. If it doesn't, the Cloudflare
  record is wrong or proxied.
- Cloudflare proxy must be **off** (gray cloud).

### 4. Update env vars + redirect (2 min)

1. Render dashboard → `aisb-invoicer` → **Environment**.
2. Update `NEXTAUTH_URL` from `https://aisb-invoicer.onrender.com` to
   `https://invoices.aisolutionsbb.com`. **Critical:** magic-link
   sign-in links bake in `NEXTAUTH_URL`; if it doesn't match the
   browser host, callbacks fail with `CSRF` errors.
3. Save → triggers redeploy (~2 min).

### 5. (Optional) 301 redirect from the onrender.com URL

Once the custom domain is healthy, redirect the bare Render URL so
old bookmarks land at the branded URL.

- Render dashboard → `aisb-invoicer` → **Settings** → **Redirects/Rewrites**.
- Add rule: Source path `*`, host `aisb-invoicer.onrender.com`, type
  `Redirect`, status `301`, target
  `https://invoices.aisolutionsbb.com/$1`.

(Alternatively, leave both URLs alive — useful for debugging when
DNS or cert issues arise.)

### 6. Smoke test

1. https://invoices.aisolutionsbb.com → should serve the marketing page
   with a valid green-padlock cert.
2. Sign in flow end-to-end (assumes SendGrid is done first):
   request magic link → email arrives with `invoices.aisolutionsbb.com`
   URL → click → authenticated dashboard.
3. Check `https://invoices.aisolutionsbb.com/api/health` → `{"ok":true}`.

## Things to know

- **Re-deploys lose nothing.** Custom domain + TLS cert survive deploys
  — they live on the service, not the build.
- **TLS renewal.** Render auto-renews Let's Encrypt certs ~30 days
  before expiry. No action needed.
- **Apex (aisolutionsbb.com) is NOT pointed here.** This is a
  subdomain only. The marketing site at the apex stays on whatever
  it currently uses.
