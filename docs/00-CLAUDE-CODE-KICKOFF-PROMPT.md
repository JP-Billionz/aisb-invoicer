# Claude Code Kickoff Prompt — AISB Invoicer SaaS

Copy and paste **the entire block below** into your open Claude Code session,
then send. Claude Code will read the spec files in this folder and start work.

If your Claude Code session is open in a different working directory, first
`cd` into the folder where you want the new repo to live (recommended:
`~/code/aisb-invoicer-saas/` on your laptop). Don't put the repo inside the
OneDrive sync folder — Node's `node_modules` doesn't play well with OneDrive.

---

```
You are starting a new project for AI Solutions Barbados.

CONTEXT
-------
We are taking an existing single-file HTML invoicing app and turning it into
a multi-tenant SaaS. Read the spec files in this folder before doing anything:

  /mnt/c/Users/Pucks/OneDrive/Documentos/AI Sol - 2nd Brain - V.2/_Business/AISB-Invoicer-SaaS/

  - 01-PROJECT-SPEC.md          — full requirements
  - 02-ARCHITECTURE.md          — tech stack and module structure
  - 03-DATA-MODEL.md            — Postgres schema and tenant isolation rules
  - 04-USER-FLOWS.md            — signup, trial, paid, invoice creation, history
  - 05-DEPLOYMENT.md            — Render setup, env vars, custom domain
  - reference-current-app/       — current HTML app to mirror in UX

(If you are on Windows, the path will be: `C:\Users\Pucks\OneDrive\Documentos\AI Sol - 2nd Brain - V.2\_Business\AISB-Invoicer-SaaS\`)

TASK
----
Build the AISB Invoicer SaaS following the spec. Today's goal is Phase 1A:
  1. Initialize the project skeleton (Next.js 14 App Router + TypeScript + Tailwind)
  2. Set up Postgres connection (Prisma) with the schema from 03-DATA-MODEL.md
  3. Implement email-magic-link auth (NextAuth) with tenant creation on signup
  4. Build the minimal "create invoice" flow that mirrors the current app
  5. Wire jsPDF-based PDF export server-side
  6. Push to GitHub (create a new private repo: aisb-invoicer)
  7. Deploy to Render and verify the staging URL works

Stop after step 7 and write a short status report at:
  _Business/AISB-Invoicer-SaaS/STATUS-DAY-1.md

The report should list:
  - Repo URL
  - Staging URL
  - What works
  - What's left for Phase 1B (Stripe + multi-tenant invoice numbering)
  - Any blockers you hit that need a human decision

CONSTRAINTS
-----------
- TypeScript strict mode on
- ALL database queries must go through a tenant-scoped wrapper that
  enforces tenant_id matches the authenticated user's tenant
- Secrets via environment variables ONLY — never commit .env to git
- Use the AISB Invoicer V.1 design language (dark theme, brand purple
  #7C3AED, brand green #39D353) — see reference-current-app/index V.1.html
- Invoice numbers start at 10027 per tenant (NOT 1)
- Keep the "Powered by AI Solutions Barbados" footer mark on every PDF

WHO TO ASK
----------
For business/pricing/scope questions: stop and ask the user (Jamai).
For technical defaults you can make a call on: make it, document it
in the status report.

Begin by reading the five spec files. Confirm you understand the scope
before writing any code.
```

---

## What happens after you paste

1. Claude Code reads the spec files in this folder (Cowork wrote them).
2. Claude Code asks you to confirm any decisions it can't make alone
   (Render account, GitHub access, Postgres choice).
3. Claude Code scaffolds the project, runs `git init`, makes its first
   commit, creates the GitHub repo, sets up Postgres on Render, and
   deploys.
4. When Claude Code is done with Phase 1A, it writes
   `STATUS-DAY-1.md` in this folder. Once that file appears, come back
   to Cowork (me) — I'll read it from OneDrive and we plan Phase 1B.

## If you hit problems

- Claude Code asks for your GitHub username/PAT → give it once, it'll
  cache it.
- Claude Code asks for your Render API key → log into Render, generate
  one, paste it. Don't put it in this folder.
- Claude Code asks for OPENAI/ANTHROPIC API keys → not needed for this
  app (no AI features here yet). Skip.
- If Claude Code stalls, ask it to "summarize current state and what
  you're blocked on" — never let a session sit silent.

## Channel handoff back to Cowork

When Claude Code finishes a task, it leaves a `STATUS-*.md` file in this
folder. I will read it next time you come back to Cowork. So our shared
language is **files in this folder** — write status, read spec, repeat.
