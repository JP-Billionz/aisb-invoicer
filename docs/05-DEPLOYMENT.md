# Deployment — AISB Invoicer SaaS

## Target environment
- **Host**: Render (Web Service)
- **Database**: Render Postgres (starter tier; daily backups included)
- **DNS**: Cloudflare → `invoices.aisolutionsbb.com`
- **SSL**: Let's Encrypt via Render (automatic)
- **Region**: Render's closest North America region (lowest latency to Barbados)

## One-time setup (Claude Code should do this in Phase 1A)

### 1. GitHub repo
```bash
# Initialize repo
cd ~/code/aisb-invoicer
git init
git branch -M main

# Add .gitignore (Next.js + Prisma defaults)
# Add .env.example documenting all required vars
# DO NOT commit .env

git add .
git commit -m "Initial scaffold"

# Create remote on GitHub (Claude Code will use gh CLI if installed,
# otherwise ask user to create manually)
gh repo create aisolutionsbb/aisb-invoicer --private --source=. --push
```

### 2. Render Web Service
1. Render Dashboard → New → Blueprint
2. Connect the GitHub repo
3. Render auto-detects Next.js and proposes a Web Service
4. Choose:
   - Instance type: **Starter** ($7/mo)
   - Region: Ohio or Oregon (US-East / US-West)
   - Branch: `main` (auto-deploy on push)
   - Build command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - Start command: `npm start`

### 3. Render Postgres
1. Render Dashboard → New → Postgres
2. Plan: Starter ($7/mo) — includes daily backups, 1 GB storage, plenty for first year
3. Region: same as Web Service
4. Copy the `DATABASE_URL` into the Web Service env vars

### 4. Custom domain
1. Render Web Service → Settings → Custom Domain → add `invoices.aisolutionsbb.com`
2. Render gives a target CNAME (something like `aisb-invoicer.onrender.com`)
3. Cloudflare DNS → add a CNAME record:
   - Name: `invoices`
   - Target: the Render CNAME
   - Proxy status: DNS only (gray cloud) for first verification, then can be proxied
4. Wait ~5 minutes for SSL cert
5. Test `https://invoices.aisolutionsbb.com` loads with valid cert

### 5. Environment variables on Render
Set these in Render Web Service → Environment:

| Key | Source |
|---|---|
| `DATABASE_URL` | Render Postgres connection string |
| `NEXTAUTH_URL` | `https://invoices.aisolutionsbb.com` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `EMAIL_FROM` | `"AISB Invoicer <noreply@aisolutionsbb.com>"` |
| `SENDGRID_API_KEY` | from SendGrid dashboard (after domain verification) |
| `STRIPE_SECRET_KEY` | from Stripe (live mode after testing in test mode) |
| `STRIPE_PUBLISHABLE_KEY` | from Stripe |
| `STRIPE_WEBHOOK_SECRET` | from Stripe webhook config |
| `STRIPE_PRICE_STARTER` | Stripe Price ID for Starter plan |
| `STRIPE_PRICE_GROWTH` | Stripe Price ID for Growth plan |
| `STRIPE_PRICE_PRO` | Stripe Price ID for Pro plan |
| `SENTRY_DSN` | from Sentry project |
| `NODE_ENV` | `production` |

### 6. SendGrid setup (for magic links + invoice emails)
1. SendGrid → Settings → Sender Authentication → Domain Authentication
2. Authenticate `aisolutionsbb.com` (add the CNAME records to Cloudflare)
3. Create API key with "Mail Send" scope
4. Paste into Render env vars

### 7. Stripe setup
1. Stripe Dashboard → Products → create three products:
   - AISB Invoicer Starter — BBD $29/mo recurring
   - AISB Invoicer Growth — BBD $59/mo recurring
   - AISB Invoicer Pro    — BBD $99/mo recurring
2. Copy each Price ID into Render env vars
3. Stripe Dashboard → Developers → Webhooks → add endpoint
   `https://invoices.aisolutionsbb.com/api/stripe/webhook`
4. Subscribe to events: `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_succeeded`, `invoice.payment_failed`
5. Copy signing secret into Render env vars

### 8. Sentry
1. Sentry → Create project → Next.js
2. Run `npx @sentry/wizard@latest -i nextjs` in the repo
3. Commit the config files
4. Paste DSN into Render env vars

### 9. Status page
1. Better Stack → Add monitor → URL `https://invoices.aisolutionsbb.com/api/health`
2. (Claude Code adds the `/api/health` route in Phase 1A — return `{ ok: true }`)

## Deployment process (after the one-time setup)

Every `git push origin main` triggers a Render auto-deploy. Render:
1. Pulls latest code
2. Runs `npm install`
3. Runs `npx prisma generate && npx prisma migrate deploy` (applies any new migrations)
4. Runs `npm run build`
5. Restarts the service with zero downtime (rolling restart on Standard tier; brief blip on Starter tier)

## Pre-launch smoke test (run after every prod deploy)

```bash
# Health
curl -fsS https://invoices.aisolutionsbb.com/api/health

# Marketing
curl -fsS https://invoices.aisolutionsbb.com/ -o /dev/null

# Magic link signin
# (manual — request a magic link, check it arrives, click through)

# Stripe webhook
# (stripe CLI in test mode forwarding to staging)
```

## Backups and disaster recovery

- Render Postgres: daily automated backups, 7-day retention on Starter
- For longer retention: weekly `pg_dump` to S3 / OneDrive (set up in Phase 1B)
- Test restore quarterly into a staging database

## Costs at launch

| Item | Monthly (USD) | Monthly (BBD ~2x) |
|---|---|---|
| Render Web Service Starter | $7 | $14 |
| Render Postgres Starter | $7 | $14 |
| Cloudflare DNS | $0 | $0 |
| SendGrid free tier (100 emails/day) | $0 | $0 |
| Sentry free tier | $0 | $0 |
| Domain (annual / 12) | $1 | $2 |
| Stripe (transaction fees, ~3%) | variable | variable |
| **Total fixed** | **~$15** | **~BBD $30** |

Single paying customer at BBD $29/mo covers it. Customer #2 onwards is gross profit.
