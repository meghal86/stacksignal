# StackSignal — Claude Code Context

## What This Project Is
StackSignal turns ecosystem signals into ranked business ideas, then tells 
founders which one is worth building via a Build/Skip/Watch verdict.

Free = discovery (top 5 ideas from any repo/package).
Paid = decision (which one to build, with 7-day validation plan).

## Tech Stack (Non-Negotiable)
- Next.js 14 App Router + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage + RLS)
- Prisma ORM
- Inngest (background jobs and crons)
- Gemini (gemini-2.5-flash) via Google Generative AI SDK
- Stripe (subscriptions + webhooks)
- Resend (transactional email)
- Vercel (frontend deployment)
- Railway (Inngest workers)

## Key Conventions
- All API routes in app/api/ use Next.js Route Handlers
- All database access goes through Prisma client (lib/prisma.ts)
- All signal fetchers return typed objects OR SignalError — never throw
- All AI calls use gemini-2.5-flash
- All external API keys come from environment variables only
- Never hardcode secrets anywhere
- Credits deducted AFTER completion, never before
- No auto-posting to any platform — generate drafts, user posts manually

## Credit System
- FREE: 3 analyses/month
- BUILDER ($19/mo): 30 credits
- PRO ($49/mo): 100 credits
- Basic analysis (ideas only): 1 credit
- Full decision: 5 credits
- Build Room generation: 10 credits

## Verdict Rules (Exact)
- SKIP if: crowdedness score < 3 OR platformRisk > 8
- BUILD if: composite score >= 7.0 AND crowdedness >= 5
- WATCH: everything else

## Signal Scoring (0-12)
- Stars > 10K = +2, > 1K = +1
- Weekly downloads > 1M = +2, > 100K = +1
- Hosting issues > 100 = +1
- Enterprise issues > 50 = +1
- HN unsolved posts > 10 = +1
- Low crowdedness (< 3 competitors) = +2
- Active maintenance (commit < 30 days) = +1
- Accelerating star velocity = +1

## File Structure
app/
  (public)/page.tsx          — homepage + leaderboard
  (public)/report/[slug]/    — public analysis page
  (auth)/build-room/[id]/    — Build Room workspace
  api/analyze/               — main analysis endpoint (streaming)
  api/webhooks/stripe/       — Stripe events
lib/
  prisma.ts                  — Prisma singleton
  signals/github.ts          — GitHub signal fetcher
  signals/packages.ts        — npm/PyPI fetcher
  signals/hn.ts              — HN Algolia fetcher
  signals/competition.ts     — Serper competition check
  scoring/signals.ts         — 0-12 signal score
  scoring/ideas.ts           — 9-dimension idea scores
  agents/opportunityEngine.ts — top 5 ideas generator
  agents/decisionEngine.ts   — Build/Skip/Watch verdict
  agents/prompts.ts          — all Claude prompts
inngest/
  functions/                 — all Inngest jobs
prisma/
  schema.prisma              — database schema

## Environment Variables Required
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY
GITHUB_TOKEN
SERPER_API_KEY
