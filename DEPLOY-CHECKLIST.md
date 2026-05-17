# Deploy Checklist — AISB Invoicer Phase 1A → Render

Estimated time: **5–10 minutes** (mostly waiting on the first build).

## What's already in the repo

- `render.yaml` — a Render Blueprint that defines the Web Service + the Postgres database in one shot
- The build runs `prisma db push` so the first deploy syncs the schema directly. (Phase 1B will replace this with `prisma migrate deploy` + a committed initial migration, once we have a live DB to cut the migration against.)
- `/api/health` returns `{ ok: true }` (Render uses this as the health check)

## 1. Create the Blueprint in Render

1. Log into [Render](https://dashboard.render.com).
2. **New** → **Blueprint**.
3. Connect the GitHub repo `JP-Billionz/aisb-invoicer`.
4. Render reads `render.yaml` and proposes:
   - **Web Service**: `aisb-invoicer` (Node, Starter plan, Ohio region)
   - **Postgres**: `aisb-invoicer-db` (Basic-256mb plan, Ohio region)
5. Click **Apply**. Render provisions both. `DATABASE_URL` auto-wires from
   the DB into the Web Service; `NEXTAUTH_SECRET` is auto-generated.

## 2. Fill in the two env vars that need a human

After the Blueprint creates the service, open the Web Service →
**Environment** tab and set:

| Key | Value |
|---|---|
| `NEXTAUTH_URL` | `https://aisb-invoicer.onrender.com` initially. After the custom domain is wired in step 4, change to `https://invoices.aisolutionsbb.com`. |
| `SENDGRID_API_KEY` | Leave blank for Phase 1A. (Magic-link URLs print to Render logs — see the Phase 1A note below.) Fill in Phase 1B. |

Save → Render kicks off a deploy. First build is ~5 minutes.

## 3. Smoke test the staging URL

Once the deploy is green:

```bash
# Health check
curl -fsS https://aisb-invoicer.onrender.com/api/health
# → {"ok":true,...}

# Marketing page
open https://aisb-invoicer.onrender.com
```

**Sign-in flow (Phase 1A):**
1. Click "Sign in" → enter your email → submit.
2. Open Render dashboard → Web Service → **Logs** → look for:
   ```
   === MAGIC LINK (Phase 1A — no live email) ===
   To:   you@example.com
   Link: https://aisb-invoicer.onrender.com/api/auth/callback/email?...
   ```
3. Paste that URL into your browser. You're signed in. A tenant is
   auto-created with `nextInvoiceNumber = 10027` and a 14-day trial.

## 4. Custom domain (optional for staging, required for launch)

1. Render Web Service → **Settings** → **Custom Domains** → **Add Custom
   Domain** → `invoices.aisolutionsbb.com`.
2. Render shows a CNAME target like `aisb-invoicer.onrender.com`.
3. Cloudflare DNS → **Add record**:
   - Type: CNAME
   - Name: `invoices`
   - Target: the Render CNAME
   - Proxy: **DNS only** (gray cloud) until the SSL cert issues, then
     you can proxy it.
4. Wait ~5 minutes. Render auto-issues a Let's Encrypt cert.
5. Update `NEXTAUTH_URL` to `https://invoices.aisolutionsbb.com` in the
   Web Service env vars and redeploy.

## 5. After deploy: paste the live URL back to me

Reply in chat with:
- The staging URL (`https://aisb-invoicer.onrender.com` or the custom one)
- Whether `/api/health` returned 200
- Whether you got the magic link in the Render logs and were able to sign in

I'll update `docs/STATUS-DAY-1.md` with the live URL and we move on to
Phase 1B (Stripe + SendGrid wire-up + tenant settings editor).

## What you do NOT need to set up today (Phase 1B)

- SendGrid (skip for Phase 1A — magic links go to logs)
- Stripe products & webhook
- Sentry
- Better Stack status page

## If something breaks

- **Build fails on `prisma db push`** → check that
  `DATABASE_URL` is populated in the Web Service env vars (the
  Blueprint should auto-wire it; if not, manually paste the internal
  DB URL from the Postgres dashboard).
- **Build fails on `npm install`** → Render's Node version. We pin
  `engines.node >= 20` in `package.json`; Render should pick Node 20.
  If not, set `NODE_VERSION=20` in the env vars.
- **Sign-in returns 500** → almost always `NEXTAUTH_URL` mismatch with
  the actual host. Make sure it equals the URL in your browser bar.
