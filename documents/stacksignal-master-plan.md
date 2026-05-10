# StackSignal — Master Plan
**Version 8.0 | Decision Compression Engine**
**May 2026**

---

## What Changed In v8.0

This version incorporates validated market research and venture telemetry feedback.
Four specific shifts:

1. **Reframe from idea discovery to decision compression.** The product is not
   another idea browser. It compresses weeks of founder research into a single
   Build/Skip/Watch verdict. Decision compression is what people pay for.

2. **Lead with Skip logic.** Every free tool tells founders what to build.
   Nobody tells them what NOT to build with evidence. The Skip verdict is the
   highest-value output and the primary differentiator.

3. **WTP asymmetry acknowledged.** Founders are price-sensitive and treat idea
   tools as entertainment. Investors and studios pay $5K-$10K/year for the same
   data. The product must serve both tracks from day one.

4. **$29 manual report test is Phase 0.** No automated dashboard until 3-5
   manual reports are sold. Payment proves willingness to pay. Upvotes do not.

---

## The One-Line Definition

StackSignal tells founders — with signal evidence — exactly what is worth
building and exactly what is not. Decision compression, not idea discovery.

---

## Core Positioning

```
FREE  = discovery  (top ideas from any repo or ecosystem)
PAID  = decision   (which one to build, why not the others,
                    7-day validation plan, full execution package)
```

**The Skip verdict is the product.**

Most tools say "here are 10 ideas." StackSignal says "here is the one worth
building and here is exactly why the other nine will fail — with evidence."
That is a fundamentally different and more valuable output.

---

## Why The Core Signal Works

The premise is scientifically validated. Venture research from Oxx has
quantified Product Community Fit (PCF) — projects reaching 50-100 active
monthly contributors often tip into exponential commercial growth. Tools using
this methodology have identified startups that raised over $3.7 billion in
venture capital. StackSignal automates detection of these technical tipping
points.

This is not a hunch. The signal has already proven its value to institutional
investors. You are making it accessible to founders and investors who cannot
afford Harmonic ($10K+/year) or Dealroom.

---

## The WTP Reality

| Audience | Behavior | WTP |
|---|---|---|
| Founders | Self-source momentum, price-sensitive, treat idea tools as entertainment | $29-49 one-time or $19-49/month |
| Investors / Angels / Studios | Source other people's momentum, information gap = lost deals | $2K-10K/year |

**The plan:** Build one engine. Sell it two ways.

Track A (founders) builds audience and generates content.
Track B (investors/studios) generates serious revenue.

If Track A fails to convert → full pivot to Track B.
The engine is the same. The packaging and pricing changes.

---

## The Rule

> Not in Phase 0-3? It does not exist yet.
> Sell before you build.
> Skip verdicts before Build verdicts.
> This weekend: sell 3 reports manually for $29 each.

---

## Phase 0 — Prove Payment (This Weekend)
**Duration: 2 days | Cost: $14 | Gate: 3 paid sales**

No product code. No automation. No dashboard.

### The Only Task

Write 3 hand-crafted Skip Reports manually. Pick opportunities that look
attractive on the surface but have fatal flaws underneath. These are more
compelling than Build reports because the insight is counterintuitive.

**Report format:**

```
TARGET: [repo, MCP, or ecosystem]
VERDICT: SKIP

WHY IT LOOKS ATTRACTIVE:
  → [surface signal that fools people]
  → [star count, download numbers, HN mentions]

WHY IT FAILS:
  → [funded competitor that already owns this]
  → [pricing collapse risk with evidence]
  → [platform dependency that kills the moat]
  → [TAM that sounds big but is actually tiny]

WHAT WOULD CHANGE THIS VERDICT:
  → [specific trigger 1]
  → [specific trigger 2]

COST OF BEING WRONG:
  → [months wasted, money lost, opportunity cost]

CONFIDENCE: 8.5/10
```

### Where To Post The Offer

```
HN:            "I'll write you a Skip Report on any repo or MCP 
                you're considering building around — $29, 24hr 
                turnaround, refund if not useful"

r/SideProject: Same copy, different framing

IndieHackers:  Same offer, add one sample Skip report inline
```

Include one complete sample Skip report in every post. The sample IS the
marketing. People need to see the quality before paying.

### What You Learn

- If 3 people pay → the decision compression insight has value → build Phase 1
- If 0 people pay → the offer needs adjustment, not the product
- If people ask for Build reports instead → adjust framing, lead with Build first
- If an investor or studio DMs → immediately pivot to Track B conversation

### Gate

3 paid sales by Tuesday EOD. Not upvotes. Not DMs. Sales.

---

## Phase 1 — The Engine (Month 1-2)
**2 signals only. Daily output. No UI. No auth. No Stripe.**

### Track A: Automated Skip/Build Reports

**Week 3: GitHub + npm pipeline**
- GitHub API fetcher: stars, velocity, issues (90-day window)
- Issue classifier: hosting requests, enterprise requests, feature gaps
- npm/PyPI download fetcher
- 2-signal opportunity scorer (0-10)
- Skip signal detector: funded competitors, platform risk, crowdedness
- Build/Skip/Watch verdict generator (Gemini 2.5 Flash free tier)
- Inngest daily cron: analyze 20 repos, store in Supabase
- Output: markdown report per analysis

**Week 4: Content distribution**
- Twitter/X thread generator from best daily verdict
- Auto-post daily at 9am UTC
- Email capture form (Resend free tier)
- Manual post to HN + IndieHackers weekly (not automated)

**Week 5-6: Skip signal depth**
- Serper integration for competition check (now worth $50/month)
- ProductHunt search for existing solutions
- Funded competitor detection from Crunchbase/Google signals
- Update verdict to lead with Skip evidence when applicable

### Track B: Manual Investor Outreach (Parallel)

Do not wait for Track A to work before starting Track B.

- Build a Notion page with 25 weekly verdicts (manual curation)
- Email 10 solo angels, micro-VC scouts, startup studios
- Offer: free 30-day access to weekly signal digest
- Goal: 3 calls, listen for "I would pay $X/year for this"
- If any of them say yes → Track B becomes the primary product

### Gates

Track A: 10 paid $29 reports/week OR 200 email subscribers
Track B: 1 investor says "I'd pay $2K+/year" → start building B dashboard

---

## Phase 2 — Public Site (Month 3)
**Static site. SEO foundation. Two products visible.**

### What Gets Built

- Next.js site showing last 30 verdicts (public, free to read)
- Skip verdicts featured prominently (not hidden — this is the differentiator)
- Self-serve analysis input: paste any GitHub URL or describe ecosystem
- Founder profile: 3 questions, personalized output
- Shareable analysis URL per verdict
- Email capture on every page (P0, not optional)
- Weekly newsletter: "3 things you should NOT build this week + why"

**SEO pages (Astro static generation):**
- "[repo] is it worth building around" (high intent)
- "[repo] competitors already exist" (Skip signal content)
- "[MCP name] enterprise ready or not" (agentic economy wedge)
- "should I build [opportunity type]" (decision query)

**The newsletter angle:**

"3 things you should NOT build this week" is more compelling than "3 hot
startup ideas." It is counterintuitive, more shareable, and directly
demonstrates the Skip verdict value proposition.

### Gates

500 email subscribers AND one of:
- $500/month Track A revenue, OR
- Track B investor conversation with verbal commitment

---

## Phase 3 — First Revenue (Month 4-6)

### Track A Monetization

**Apply to affiliate programs** (now have traffic — programs will approve):
- Supabase, Railway, Clerk, Resend, Vercel, Sentry, Upstash
- ~$37/month per active builder who follows recommendations

**Tool comparison pages** (highest-converting affiliate content):
- "[Tool A] vs [Tool B] for [specific use case]"
- Signal-ranked recommendations, not editorial opinion

**First starter template** ($79):
- Managed hosting starter (Next.js + Supabase + Stripe + Railway)
- Pre-filled financial model spreadsheet
- Relevant SKILL.md files included

**Credit-based subscriptions:**
- Free: 3 analyses/month
- Builder $19/month: 30 credits
- Pro $49/month: 100 credits
- Basic verdict: 2 credits, Full Build Room: 10 credits

### Track B Monetization

If Track B validation worked in Phase 1:
- Move investor/studio beta from $0 to $500/month introductory
- Build simple investor dashboard: filtered verdict feed by category
- Weekly "PCF tipping point" alert: repos crossing the 50-100 contributor threshold
- Target: 5 customers at $500/month = $2,500 MRR from B alone

### Ecosystem Expansion (Careful)

Now add broader signals beyond GitHub repos:
- MCP registry signals (Glama/Smithery install data — do NOT claim specific
  download numbers without verification)
- Agent framework adoption patterns
- Developer job posting velocity

Do not call any market "empty" or "wide open" without current data. Call it
"underserved" or "intelligence gap" — accurate framing that does not
over-promise.

### Gate

$2,000 MRR (any combination of tracks)

---

## Phase 4 — Platform (Month 5-8)
**Build only what paying customers asked for.**

Before building anything in Phase 4, read every email reply, HN comment,
and support message. List features requested 5+ times. Build those. Nothing else.

### Conditional Builds

**If 20+ founders asked for saved verdicts:**
- Clerk auth, profile persistence, analysis history
- Alert system: notify when signal score crosses threshold

**If 5+ investors asked for more signal depth:**
- Add Signals 3-5: Docker Hub pulls, job postings, G2 reviews
- Update scoring to 5-signal algorithm (0-12 scale)
- Track B API access ($500-2K/month)

**If users asked for implementation:**
- Build Room: 5 tabs (Decision, Blueprint, Build Tasks, Launch, Financials)
- Business model router: SaaS / Agency / API / Template
- Human approval gates before any external action
- Agent tasks + founder tasks split

**Default (always build in Phase 4):**
- Historical database: 12-month pattern analysis
- PCF tipping point detector (the Oxx methodology automated)
- "Founders who built this" success/failure tracking

### Gate

$5,000 MRR

---

## Phase 5 — Scale (Month 9-12)
**Only if Phase 4 gate hit.**

- Historical signal database: which patterns produced successful companies
- Predictive scoring: "repos with these signals succeed X% of the time"
- Track B at scale: 20+ investors/studios at $500-2K/month
- Studio tier ($499/month): team + white-label
- "StackSignal Index" quarterly report — published, builds authority
- Acquisition conversations only if someone initiates

### Gate

$15,000 MRR → acquisition-ready

---

## The Nine Signals (Sequenced, Not All At Once)

| Signal | Phase | Proves | API |
|---|---|---|---|
| 1. GitHub stars + velocity | Phase 1 | Developer interest + momentum | GitHub free |
| 2. npm/PyPI downloads | Phase 1 | Production adoption | npm/PyPI free |
| 3. HN demand posts | Phase 3 | Explicit unmet demand | Algolia free |
| 4. Competition (Google/PH) | Phase 1 | Market gap | Serper $50/mo |
| 5. Docker Hub pulls | Phase 4 | Enterprise deployment | Docker Hub free |
| 6. Job postings velocity | Phase 4 | Enterprise adoption | Indeed limited |
| 7. G2/Capterra reviews | Phase 4 | Competitor weaknesses | Scraping |
| 8. MCP/Agent signals | Phase 3 | Agentic economy adoption | Glama free |
| 9. Skills install data | Phase 4 | Developer workflow gaps | Skills.sh free |

**Rule:** Each new signal must improve verdict accuracy. Add signals to improve
decisions, not to make the product sound more impressive.

---

## Revenue Model (Both Tracks)

### Track A — Founders

| Stream | Price | Phase |
|---|---|---|
| Manual Skip/Build reports | $29 each | Phase 0 now |
| Starter templates | $79 each | Phase 3 |
| Builder subscription | $19/month | Phase 3 |
| Pro subscription | $49/month | Phase 3 |
| Affiliate commissions | ~$37/active user/month | Phase 3 |
| Skill bundles | $29/month | Phase 5 |

### Track B — Investors / Studios / Angels

| Stream | Price | Phase |
|---|---|---|
| Beta access (manual digest) | $500/month | Phase 2 |
| Standard (solo angels, scouts) | $2K-5K/year | Phase 3 |
| Studio tier (multi-seat) | $10K-15K/year | Phase 4 |
| Enterprise API (VC firms) | $20K-25K/year | Phase 5 |

### Revenue Projections (Honest)

| Month | Track A | Track B | Total MRR |
|---|---|---|---|
| 1 | $87 (3 reports) | $0 | $87 |
| 3 | $1,200 | $0 | $1,200 |
| 6 | $4,500 | $2,500 | $7,000 |
| 9 | $12,000 | $8,000 | $20,000 |
| 12 | $22,000 | $15,000 | $37,000 |

Month 12 is achievable. It is not guaranteed. It requires both tracks
converting, affiliate revenue compounding, and at least 5 Track B customers.

---

## Unit Economics (Profitable By Design)

```
Cost per analysis:
  GitHub API:        $0.000  (free authenticated)
  npm/PyPI APIs:     $0.000  (free public)
  Gemini 2.5 Flash:  $0.000  (free tier Phase 0-2)
                     $0.025  (paid tier Phase 3+)
  Serper:            $0.020  (competition check)
  ─────────────────────────────────────────────
  Total Phase 0-2:   ~$0.02 per analysis
  Total Phase 3+:    ~$0.045 per analysis

Fixed monthly costs:
  Railway:           $20
  Supabase:          $25
  Serper:            $50  (add in Phase 1 Week 5)
  Domain:            $1
  ──────────────────────
  Total:             $96/month

Break-even:
  Phase 0: 4 manual reports ($29 × 4 = $116)
  Phase 3: 6 Builder subscribers ($19 × 6 = $114)

You are profitable from the first week if 4 people pay $29.
This is the infinite runway that lets you iterate without pressure.
```

---

## The Build Room (Phase 4 — After Validation)

Activates only on BUILD verdict. Five tabs generated in sequence.
Human approval required before each tab unlocks the next.

```
Tab 1: Decision
  Selected opportunity, verdict reasoning, skip risks,
  founder unfair advantage, business model routing
  (SaaS / Agency / API / Template / Data Product)

Tab 2: Blueprint
  Product spec, architecture, Prisma schema,
  API map, signal-ranked tool comparison + affiliate links

Tab 3: Build Tasks
  Agent tasks (auto-generated, Claude Code ready)
  Founder tasks (require human decision)
  Export: GitHub Issues / Notion / Linear

Tab 4: Launch
  Landing page copy, first 5 posts per platform,
  first 20 prospect profiles from signal data,
  email sequence drafts

Tab 5: Financials
  Build cost calculator (hours × rate slider)
  Monthly running cost (live tool pricing)
  3 revenue scenarios (conservative/realistic/optimistic)
  Break-even timeline
  Benchmark comparison from historical data
```

No tab auto-posts or auto-deploys. Every external action requires explicit
user approval. This is non-negotiable.

---

## Signal Scout — Brand Identity

The mascot system is confirmed. Five color tokens:

```
Signal (Action):   #FF4800  — orange, CTAs, high scores
Clarity (Good):    #C5E600  — yellow-green, verified signals
Insight (Focus):   #00B8A0  — teal, secondary data, watch verdicts
Ink (Everything):  #1A1A1A  — near-black, all text and outlines
Canvas (Base):     #F5F0E8  — warm cream, page background
```

Scout poses map to UI states:
- Default (pointing up): hero, navigation
- Detective (magnifying glass): analysis in progress
- Headphones: processing, loading
- Surprised/alarmed: error states
- Spray can: tagging new high signals
- Flag: milestones, achievements
- Sitting sad: empty states, no results found

---

## Anti-Features (Never Build)

| Feature | Why |
|---|---|
| Generic workflow automation | That is Cofounder's product |
| "Run your whole company" promise | Impossible to deliver |
| 9 signals before Phase 4 | Adds noise not accuracy in early phases |
| Subscriptions before manual validation | Premature |
| Affiliate program applications before traffic | They reject you |
| Unverified statistics in marketing copy | Destroys trust |
| Calling any market "empty" | Inaccurate, over-promises |
| Live write-actions to Gmail/Slack/Stripe | Requires audit trail, permissions |
| Mobile app | Wrong audience |
| Exit multiple calculations in planning | Toxic distraction |
| Biasing tool rankings toward commission | Permanent trust destruction |
| Automated cold outreach | CAN-SPAM, trust damage |

---

## The One-Page Summary

```
STACKSIGNAL — DECISION COMPRESSION ENGINE

THE PRODUCT
  Tell founders what is worth building AND what is not,
  with signal evidence. Skip verdicts are the primary value.
  Free = discovery. Paid = decision.

THE INSIGHT
  Engineering telemetry predicts commercial success.
  PCF methodology identified $3.7B in VC-backed companies.
  You automate the detection of technical tipping points.

THE WTP REALITY
  Founders: $29-49 (price sensitive, entertainment mindset)
  Investors: $2K-10K/year (information gap = lost deals)
  Build one engine. Sell it two ways.

PHASE 0 (This weekend): $14 cost
  Sell 3 Skip Reports manually at $29 each
  Gate: 3 paid sales — not upvotes, not DMs

PHASE 1 (Month 1-2): 2 signals automated
  GitHub + npm pipeline, Skip signal detector
  Track B: manual investor outreach in parallel
  Gate: 10 reports/week OR 1 investor verbal commit

PHASE 2 (Month 3): Public site
  Newsletter: "3 things NOT to build this week"
  Gate: 500 email subscribers

PHASE 3 (Month 4-6): First revenue
  Affiliate + templates + subscriptions + Track B beta
  Gate: $2,000 MRR

PHASE 4 (Month 5-8): Platform
  Build only what paying customers asked for
  Gate: $5,000 MRR

PHASE 5 (Year 2): Scale
  Historical data, B2B API, StackSignal Index
  Gate: $15,000 MRR

THE MASCOT
  Signal Scout — orange visor, antenna, satchel
  Five color tokens: Signal/Clarity/Insight/Ink/Canvas

THE RULE
  Sell before you build.
  Skip before Build.
  Evidence before claims.
  Not in Phase 0-3? Does not exist yet.
```

---

*Version 8.0 | May 2026*
*Gemini 2.5 Flash for Phase 0-2, Claude Sonnet from Phase 3*
*Next action: Saturday — write 3 Skip Reports, post $29 offer*
*Gate: 3 paid sales by Tuesday EOD*
