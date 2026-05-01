---
description: Full pre-deploy validation + deploy to production. Confirms with user before any irreversible step.
---

You are running the **production deploy pipeline**.

## Step 1 — Confirm Intent
Ask user: "Deploy to production? Target (Vercel/Netlify/Cloudflare)?"

## Step 2 — Pre-deploy Validation (parallel where possible)
Spawn in parallel:
- `spec-compliance-auditor`
- `migration-readiness-checker`
- `data-consistency-auditor`
- `i18n-format-validator`

Block deploy if any returns ❌. Surface gaps to user.

## Step 3 — Build & Test
Sequentially:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Bundle size check (warn if any route >500KB first-load JS)
- `mobile-ui-tester` smoke on root tabs

## Step 4 — Deploy
Spawn `deploy-orchestrator`. Confirm again before push.

## Step 5 — Post-deploy
Hit deployed URL, verify `/` redirects to `/transactions`, all 4 tabs load. Report URL to user.
