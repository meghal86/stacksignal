# StackSignal — Functional Requirements Document
**Version 1.0 | For Claude Code Development**
**Status: Ready to implement**

---

## How To Use This Document

This FRD is structured for Claude Code sessions. Each section maps to one Claude Code prompt. Work top to bottom. Do not skip sections. Every requirement has an acceptance test so you know when it is done.

---

## Section 1 — Project Setup

### 1.1 Tech Stack (Non-Negotiable)

```
Frontend:        Next.js 14 (App Router) + TypeScript + Tailwind CSS
Database:        Supabase (Postgres + Auth + Storage)
ORM:             Prisma
Background jobs: Inngest
AI:              Anthropic Claude Sonnet (claude-sonnet-4-20250514)
Email:           Resend
Payments:        Stripe
Deployment:      Vercel (frontend) + Railway (Inngest workers)
```

### 1.2 Repository Structure

```
stacksignal/
├── app/                        # Next.js App Router
│   ├── (public)/               # No auth required
│   │   ├── page.tsx            # Homepage with leaderboard
│   │   ├── report/[slug]/      # Public analysis page
│   │   └── compare/[slug]/     # Tool comparison page
│   ├── (auth)/                 # Auth required
│   │   ├── dashboard/          # Saved reports
│   │   └── build-room/[id]/    # Build Room workspace
│   └── api/
│       ├── analyze/            # Trigger analysis
│       ├── webhooks/stripe/    # Stripe events
│       └── signals/            # Signal fetchers
├── components/
│   ├── analysis/               # VerdictCard, SignalTable, etc.
│   ├── build-room/             # BuildRoom tabs
│   └── ui/                     # Shared components
├── lib/
│   ├── signals/                # Signal fetchers
│   ├── agents/                 # Claude tool definitions
│   ├── scoring/                # Scoring algorithms
│   └── financial/              # Cost calculator
├── inngest/
│   └── functions/              # Background jobs
└── prisma/
    └── schema.prisma
```

### 1.3 Environment Variables

```bash
# Supabase
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=

# Background jobs
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email
RESEND_API_KEY=

# Signal APIs
GITHUB_TOKEN=
SERPER_API_KEY=

# Spend protection
ANTHROPIC_MAX_MONTHLY_USD=200
```

---

## Section 2 — Database Schema

### 2.1 Full Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ── USER ────────────────────────────────────────

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  stripeCustomerId String?  @unique
  plan            Plan      @default(FREE)
  creditsBalance  Int       @default(3)   // free: 3/month
  creditsResetAt  DateTime  @default(now())
  
  analyses        Analysis[]
  savedReports    SavedReport[]
  alerts          Alert[]
  founderProfile  FounderProfile?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum Plan {
  FREE       // 3 analyses/month
  BUILDER    // $19/mo — 30 credits
  PRO        // $49/mo — 100 credits
}

// ── FOUNDER PROFILE ──────────────────────────────

model FounderProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  
  background   String[] // ["sre", "fullstack", "frontend", "data", "mobile"]
  industries   String[] // ["fintech", "healthcare", "devtools", "ecommerce"]
  timeline     String   // "4weeks" | "3months" | "6months"
  
  updatedAt    DateTime @updatedAt
}

// ── SIGNAL SOURCES ────────────────────────────────

model SignalTarget {
  id            String    @id @default(cuid())
  type          TargetType
  identifier    String    // github url, npm package name, etc.
  displayName   String
  
  // Cached signal data (refreshed daily)
  signalData    Json?
  signalScore   Float?    // 0-12 composite score
  lastFetched   DateTime?
  
  analyses      Analysis[]
  
  @@unique([type, identifier])
}

enum TargetType {
  GITHUB_REPO
  NPM_PACKAGE
  PYPI_PACKAGE
  DOCKER_IMAGE
  MCP_SERVER
  DOMAIN_SEARCH  // "find opportunities in devtools"
}

// ── ANALYSIS ─────────────────────────────────────

model Analysis {
  id              String    @id @default(cuid())
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])
  targetId        String?
  target          SignalTarget? @relation(fields: [targetId], references: [id])
  
  // Input
  rawInput        String    // what user typed/pasted
  founderProfile  Json?     // snapshot of profile at analysis time
  
  // Output — Opportunity List (free)
  topIdeas        Json      // array of 5-10 business ideas with evidence
  
  // Output — Decision (paid)
  bestIdea        Json?     // single recommended opportunity
  verdict         Verdict?  // BUILD | WATCH | SKIP
  confidence      Int?      // 0-10
  verdictReasoning String?
  skipReasons     Json?     // why other ideas were rejected
  
  // Scores per best idea
  demandScore     Float?    // 0-10
  founderFitScore Float?    // 0-10
  crowdednessScore Float?   // 0-10 (lower = less crowded = better)
  wtpScore        Float?    // 0-10
  gtmFitScore     Float?    // 0-10
  buildComplexity Float?    // 0-10 (lower = simpler)
  speedToRevenue  Float?    // 0-10 (higher = faster)
  moatScore       Float?    // 0-10
  platformRisk    Float?    // 0-10 (higher = riskier)
  
  // Output — Action
  validationPlan  Json?     // 7-day validation plan
  mvpScope        Json?     // minimum viable product definition
  
  // Output — Build Room (if BUILD verdict)
  buildRoomId     String?   @unique
  buildRoom       BuildRoom? @relation(fields: [buildRoomId], references: [id])
  
  // Sharing
  slug            String    @unique @default(cuid())
  isPublic        Boolean   @default(false)
  
  // Credit cost
  creditsCost     Int       @default(1)
  
  createdAt       DateTime  @default(now())
}

enum Verdict {
  BUILD
  WATCH
  SKIP
}

// ── BUILD ROOM ────────────────────────────────────

model BuildRoom {
  id              String    @id @default(cuid())
  analysis        Analysis?
  
  // Tab 1: Decision (from Analysis)
  selectedIdea    Json      // the chosen opportunity
  
  // Tab 2: Blueprint
  productSpec     String?   // plain language product description
  architecture    Json?     // tech stack + diagram data
  prismaSchema    String?   // generated Prisma schema
  apiMap          Json?     // routes and their purpose
  stackRecs       Json?     // signal-ranked tool recommendations
  businessModel   String?   // SaaS | Agency | API | Template | DataProduct
  
  // Tab 3: Build Tasks
  agentTasks      Json?     // auto-generated task list
  founderTasks    Json?     // human-required task list
  
  // Tab 4: Launch
  landingCopy     Json?     // hero, features, pricing, CTA
  launchPosts     Json?     // 5 posts for different platforms
  prospectList    Json?     // first 20 potential customers
  
  // Tab 5: Financials
  financialModel  Json?     // complete cost + revenue model
  
  // Approval gates (human must approve each)
  blueprintApproved   Boolean @default(false)
  blueprintApprovedAt DateTime?
  launchApproved      Boolean @default(false)
  launchApprovedAt    DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ── SUPPORTING TABLES ─────────────────────────────

model SavedReport {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  analysisId String
  createdAt  DateTime @default(now())
  
  @@unique([userId, analysisId])
}

model Alert {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  targetType   TargetType
  category     String
  minScore     Float
  active       Boolean  @default(true)
  lastTriggered DateTime?
  createdAt    DateTime @default(now())
}

model EmailSubscriber {
  id        String   @id @default(cuid())
  email     String   @unique
  interests String[] // ["devtools", "fintech", "healthcare"]
  source    String?  // "homepage" | "report-page" | "hn-post"
  createdAt DateTime @default(now())
}

model AffiliateClick {
  id         String   @id @default(cuid())
  toolName   String
  toolUrl    String
  analysisId String?
  userId     String?
  createdAt  DateTime @default(now())
  converted  Boolean  @default(false)
  
  @@index([toolName])
}
```

### 2.2 Acceptance Test for Schema

```
✓ npx prisma db push runs without errors
✓ npx prisma generate completes
✓ Can create a User record
✓ Can create an Analysis linked to User
✓ Can create a BuildRoom linked to Analysis
✓ Unique constraint on [type, identifier] in SignalTarget works
```

---

## Section 3 — Signal Fetchers

### 3.1 GitHub Signal Fetcher

**File:** `lib/signals/github.ts`

**Input:** GitHub repo URL (any format: full URL, owner/repo, with or without .git)

**Output:**
```typescript
interface GitHubSignals {
  name: string           // "temporalio/temporal"
  stars: number          // 12400
  forks: number          // 890
  openIssues: number     // 234
  language: string       // "Go"
  description: string
  isArchived: boolean
  lastCommitDays: number // days since last commit
  
  // Calculated
  starsLast30d: number   // stars added in last 30 days
  velocityTrend: string  // "accelerating" | "stable" | "declining"
  
  // Issue classification (last 90 days)
  hostingRequests: number      // issues mentioning host/managed/saas
  enterpriseRequests: number   // issues mentioning sso/rbac/audit/compliance
  featureRequests: number      // labelled feature-request
  topHostingIssues: string[]   // up to 5 issue titles
  topEnterpriseIssues: string[] // up to 5 issue titles
}
```

**Implementation requirements:**
- Use GitHub REST API (not GraphQL — simpler)
- Authenticated with GITHUB_TOKEN (5000 req/hour)
- Parse URL to extract owner/repo regardless of format
- Fetch issues with these keywords for hosting: `['host', 'managed', 'saas', 'cloud', 'deploy', 'service', 'hosted']`
- Fetch issues with these keywords for enterprise: `['sso', 'rbac', 'audit', 'enterprise', 'compliance', 'soc2', 'hipaa', 'gdpr']`
- Cache result in SignalTarget.signalData for 24 hours
- Return error object (not throw) if repo not found

**Acceptance tests:**
```
✓ fetchGitHubSignals("temporalio/temporal") returns stars > 10000
✓ fetchGitHubSignals("https://github.com/n8n-io/n8n") parses correctly
✓ fetchGitHubSignals("invalid/repo-that-doesnt-exist") returns error object
✓ Result is cached in Supabase after first fetch
✓ Second call within 24h returns cached result (no API call)
```

---

### 3.2 npm/PyPI Signal Fetcher

**File:** `lib/signals/packages.ts`

**Input:** Package name + ecosystem

**Output:**
```typescript
interface PackageSignals {
  ecosystem: 'npm' | 'pypi'
  name: string
  weeklyDownloads: number
  monthlyDownloads: number
  description: string | null
  githubUrl: string | null   // extracted from package metadata
}
```

**Implementation requirements:**
- npm: `https://api.npmjs.org/downloads/point/last-week/{package}`
- PyPI: `https://pypistats.org/api/packages/{package}/recent`
- Both APIs are free and require no authentication
- If GitHub URL found in package metadata, auto-trigger GitHub signal fetch

**Acceptance tests:**
```
✓ fetchPackageSignals("@temporalio/client", "npm") returns weeklyDownloads > 0
✓ fetchPackageSignals("requests", "pypi") returns weeklyDownloads > 0
✓ fetchPackageSignals("nonexistent-pkg-12345", "npm") returns error object
```

---

### 3.3 HN Demand Signal Fetcher

**File:** `lib/signals/hn.ts`

**Input:** Search query string

**Output:**
```typescript
interface HNSignals {
  totalPosts: number
  unsolvedPosts: number  // posts with no "yes use X" top answer
  topPosts: Array<{
    title: string
    points: number
    comments: number
    url: string
    postedAt: string
  }>
}
```

**Implementation requirements:**
- Use HN Algolia API: `https://hn.algolia.com/api/v1/search`
- Query: `{input} is there a tool` + filter `tags=ask_hn` + `numericFilters=points>30`
- Last 12 months only: add `numericFilters=created_at_i>={12monthsAgoUnix}`
- Mark as "unsolved" if no comment contains "yes, use" or "try " or "check out"
- This API is completely free, no auth required

**Acceptance tests:**
```
✓ fetchHNDemand("temporal managed hosting") returns posts array
✓ Posts older than 12 months are excluded
✓ Posts with clear product recommendation are excluded from unsolvedPosts
```

---

### 3.4 Competition Fetcher

**File:** `lib/signals/competition.ts`

**Input:** Opportunity description string

**Output:**
```typescript
interface CompetitionSignals {
  competitors: Array<{
    name: string
    url: string
    priceRange: string | null  // "$99-299/mo", "free", "enterprise"
    targetMarket: string | null // "enterprise", "smb", "developer"
    weakness: string | null    // extracted from G2/reviews if found
  }>
  gapFound: boolean
  gapDescription: string  // "No solution exists between $49 and $3K"
  crowdednessScore: number // 0-10 (lower = less competition = better)
}
```

**Implementation requirements:**
- Use Serper API for Google search
- Search 1: `{opportunity} SaaS tool pricing`
- Search 2: `{opportunity} alternative`
- Extract competitor names and prices from search snippets
- crowdednessScore: 0 competitors = 1, 1-2 = 3, 3-5 = 6, 6+ = 9
- Never fabricate competitor data — only return what search results contain

**Acceptance tests:**
```
✓ fetchCompetition("managed Temporal hosting") returns competitor array
✓ crowdednessScore is between 0 and 10
✓ Empty results return gapFound: true with empty competitors array
```

---

## Section 4 — Scoring Engine

### 4.1 Signal Score (0-12)

**File:** `lib/scoring/signals.ts`

**Formula:**
```typescript
function calculateSignalScore(signals: {
  github?: GitHubSignals
  package?: PackageSignals
  hn?: HNSignals
  competition?: CompetitionSignals
}): { total: number; breakdown: ScoreBreakdown } {

  let score = 0

  // Tier 1: Production proof (max 4 points)
  if (signals.package?.weeklyDownloads > 1_000_000) score += 2
  else if (signals.package?.weeklyDownloads > 100_000) score += 1

  if (signals.github?.stars > 10_000) score += 2
  else if (signals.github?.stars > 1_000) score += 1

  // Tier 2: Demand proof (max 4 points)
  if (signals.github?.hostingRequests > 100) score += 1
  if (signals.github?.enterpriseRequests > 50) score += 1
  if (signals.hn?.unsolvedPosts > 10) score += 1
  if (signals.hn?.unsolvedPosts > 3) score += 0.5  // partial

  // Tier 3: Competition gap (max 2 points)
  const crowdedness = signals.competition?.crowdednessScore ?? 5
  if (crowdedness < 3) score += 2
  else if (crowdedness < 6) score += 1

  // Tier 4: Maintenance signal (max 2 points)
  if (signals.github?.lastCommitDays < 30) score += 1
  if (signals.github?.velocityTrend === "accelerating") score += 1

  return {
    total: Math.min(12, Math.round(score * 10) / 10),
    breakdown: {
      productionProof: /* score from tier 1 */,
      demandProof: /* score from tier 2 */,
      competitionGap: /* score from tier 3 */,
      maintenance: /* score from tier 4 */
    }
  }
}
```

### 4.2 Idea Scoring (per opportunity)

**File:** `lib/scoring/ideas.ts`

Each idea from the opportunity engine gets scored on 9 dimensions:

```typescript
interface IdeaScores {
  demand: number         // 0-10: signal evidence of people wanting this
  founderFit: number     // 0-10: match to founder profile (background + industry)
  crowdedness: number    // 0-10: 10 = wide open, 0 = saturated
  wtp: number            // 0-10: willingness to pay evidence
  gtmFit: number         // 0-10: how easy is first customer acquisition
  buildComplexity: number // 0-10: 10 = very simple, 0 = very complex
  speedToRevenue: number // 0-10: 10 = first $ in <30 days
  moat: number           // 0-10: defensibility after 12 months
  platformRisk: number   // 0-10: 10 = high risk of being killed by platform
  
  composite: number      // weighted average
  verdict: Verdict       // BUILD | WATCH | SKIP
}
```

**Composite weighting:**
```
demand:          20%
founderFit:      15%
crowdedness:     15%
wtp:             15%
gtmFit:          10%
buildComplexity: 10%
speedToRevenue:  10%
moat:            5%
platformRisk:    0% (used only for SKIP determination)
```

**Verdict thresholds:**
```
SKIP if: crowdedness < 3 OR platformRisk > 8
BUILD if: composite >= 7.0 AND crowdedness >= 5
WATCH if: composite 5.0–6.9 OR mixed signals
```

**Acceptance tests:**
```
✓ Scores sum to composite using stated weights
✓ SKIP always fires when crowdedness < 3
✓ SKIP always fires when platformRisk > 8
✓ BUILD only fires when composite >= 7.0 AND crowdedness >= 5
✓ All scores are between 0 and 10
```

---

## Section 5 — Opportunity Engine

### 5.1 Top Ideas Generator

**File:** `lib/agents/opportunityEngine.ts`

**Input:**
```typescript
interface OpportunityInput {
  signals: {
    github?: GitHubSignals
    package?: PackageSignals
    hn?: HNSignals
    competition?: CompetitionSignals
  }
  founderProfile?: FounderProfile
}
```

**Output:**
```typescript
interface TopIdea {
  rank: number
  name: string            // "Managed Temporal Hosting for SMBs"
  category: string        // from taxonomy below
  oneLiner: string        // "Self-hosting Temporal requires Kubernetes..."
  signalEvidence: string[] // specific data points cited
  targetCustomer: string  // "50-person SaaS teams running background jobs"
  roughPricing: string    // "$99-299/month"
  buildWeeks: number      // estimated weeks solo founder
}
```

**Opportunity taxonomy (always classify into one):**
```
managed_hosting      - hosted version of self-hostable tool
analytics_layer      - observability/monitoring add-on
compliance_wrapper   - security/compliance layer
migration_toolkit    - move from X to Y
marketplace_plugins  - ecosystem/plugin layer
vertical_saas        - industry-specific version
api_wrapper          - commercial API around OSS library
developer_tools      - tooling for developers building on the ecosystem
training_cert        - education and certification
```

**Claude prompt:**

```
You are a startup analyst finding business opportunities in technical ecosystems.

SIGNAL DATA:
{signalDataJson}

FOUNDER PROFILE:
{founderProfileJson}

OPPORTUNITY TAXONOMY:
managed_hosting, analytics_layer, compliance_wrapper, migration_toolkit,
marketplace_plugins, vertical_saas, api_wrapper, developer_tools, training_cert

Return exactly 5 business ideas as JSON array. Each idea must:
1. Cite specific numbers from the signal data (never estimate)
2. Fit into exactly one taxonomy category
3. Have a specific target customer (not "developers" — be precise)
4. Include rough pricing based on competition data

Return JSON only. No markdown. No preamble.
Schema: Array of TopIdea objects.
```

**Acceptance tests:**
```
✓ Always returns exactly 5 ideas
✓ Each idea has a category from the taxonomy
✓ Signal evidence cites actual numbers from input
✓ Returns valid JSON parseable without try/catch failures
✓ Ideas are ranked 1-5
```

---

### 5.2 Decision Engine

**File:** `lib/agents/decisionEngine.ts`

**Input:** TopIdea[] + signal scores + founder profile

**Output:**
```typescript
interface Decision {
  bestIdea: TopIdea
  verdict: Verdict
  confidence: number       // 0-10
  reasoning: string        // 2-3 sentences citing signal data
  
  scores: IdeaScores       // 9-dimension scores
  
  skipReasons: Array<{     // why other 4 ideas were rejected
    ideaName: string
    reason: string         // one sentence, specific
  }>
  
  validationPlan: ValidationDay[] // 7-day plan
  mvpScope: MVPScope
  
  // Personalization
  founderAdvantage: string | null  // why this founder specifically
  founderWarning: string | null    // what this founder should watch out for
}

interface ValidationDay {
  day: number
  action: string    // specific, concrete action
  goal: string      // what you learn from this action
  successSignal: string  // how you know it worked
}

interface MVPScope {
  coreFeat:ures string[]    // must-have for first paying customer
  excludedFeatures: string[] // explicitly out of scope for MVP
  firstCustomerPath: string  // exact steps to first paying user
}
```

**Claude prompt:**

```
You are a ruthless startup advisor who specializes in telling founders what NOT to build.

TOP IDEAS:
{topIdeasJson}

SIGNAL SCORES:
{signalScoresJson}

FOUNDER PROFILE:
{founderProfileJson}

SCORING RULES:
- crowdedness < 3 = automatic SKIP regardless of other scores
- platformRisk > 8 = automatic SKIP (too dependent on one platform)
- composite >= 7.0 AND crowdedness >= 5 = BUILD
- everything else = WATCH

YOUR JOB:
1. Score all 5 ideas using the 9 dimensions
2. Select the best one
3. Assign BUILD/WATCH/SKIP verdict with reasoning
4. Reject the other 4 ideas with one specific reason each
5. Generate a 7-day validation plan for the selected idea
6. Define MVP scope (what's in, what's out)

VALIDATION PLAN RULES:
- Day 1-2: research actions only (no building)
- Day 3-4: one conversation with a potential customer
- Day 5-6: one small proof of demand (post, listing, mock)
- Day 7: decision point (continue or pivot)

Return JSON only. No markdown.
```

**Acceptance tests:**
```
✓ Exactly one idea selected as bestIdea
✓ All other 4 ideas have a skipReason
✓ Validation plan has exactly 7 days
✓ MVP scope has coreFeat:ures and excludedFeatures
✓ SKIP fires when crowdedness < 3 (test with a saturated market input)
✓ founderAdvantage is null when no profile provided
```

---

## Section 6 — API Routes

### 6.1 POST /api/analyze

**Purpose:** Trigger a new analysis for a given input.

**Request body:**
```typescript
{
  input: string          // URL or text query
  inputType: "github_repo" | "npm_package" | "pypi_package" | "mcp_server" | "domain_search"
  founderProfileId?: string
  tier: "free" | "paid"  // free = top ideas only, paid = full decision
}
```

**Response (streaming):**
```typescript
// Stream of server-sent events
{ event: "signal_start", data: { signalType: "github" } }
{ event: "signal_complete", data: { signalType: "github", score: 8.2 } }
{ event: "ideas_ready", data: { ideas: TopIdea[] } }
{ event: "decision_ready", data: { verdict: Decision } }  // paid only
{ event: "complete", data: { analysisId: string, slug: string } }
```

**Business logic:**
- Check user credit balance before starting
- Deduct 1 credit for free analysis, 5 credits for paid decision
- Check cache: if same input analyzed in last 24h, return cached (0 credits)
- If anonymous user: allow 1 free analysis, then require email
- Store analysis in database regardless of user auth status

**Acceptance tests:**
```
✓ POST with valid GitHub URL starts streaming response
✓ Credits are deducted after completion (not before)
✓ Same URL analyzed twice in 24h returns cached result
✓ Anonymous user gets 1 free analysis then 401
✓ User with 0 credits gets 402 Payment Required
```

---

### 6.2 GET /api/analyze/[slug]

**Purpose:** Fetch a completed analysis by slug.

**Response:**
```typescript
{
  analysis: Analysis   // full Prisma object
  isOwner: boolean
  canAccessDecision: boolean  // true if owner + paid tier
}
```

---

### 6.3 POST /api/analyze/[id]/build-room

**Purpose:** Generate Build Room content for a BUILD verdict analysis.

**Request:** Empty body (uses analysis data)

**Business logic:**
- Only works if analysis.verdict === "BUILD"
- Generates all 5 Build Room tabs asynchronously via Inngest
- Returns immediately with buildRoomId
- Client polls for completion

**Inngest job breakdown:**
```
Step 1: Generate blueprint (product spec + architecture)
Step 2: Generate Prisma schema
Step 3: Generate API map
Step 4: Generate build tasks (agent + founder split)
Step 5: Generate launch assets
Step 6: Generate financial model
```

Each step is independent — if one fails, others continue.

---

### 6.4 POST /api/webhooks/stripe

**Purpose:** Handle Stripe subscription events.

**Events handled:**
```
checkout.session.completed   → upgrade user plan, add credits
customer.subscription.updated → update plan
customer.subscription.deleted → downgrade to FREE
invoice.payment_failed       → email user, flag account
```

---

## Section 7 — UI Components

### 7.1 AnalysisInput Component

**File:** `components/analysis/AnalysisInput.tsx`

**Behavior:**
- Single text input: "Enter a GitHub URL, npm package, or describe what you want to analyze"
- Auto-detect input type on paste (GitHub URL → github_repo, etc.)
- Show detected type as badge below input
- Domain search: if no URL detected, show "Search for opportunities in [detected domain]"
- Submit triggers /api/analyze stream

**Visual states:**
```
idle:      input + submit button
detecting: spinner + "Detecting input type..."
analyzing: progress steps showing each signal fetching
complete:  fade to results
error:     inline error message + retry button
```

---

### 7.2 ProgressSteps Component

**File:** `components/analysis/ProgressSteps.tsx`

**Steps displayed during analysis:**
```
1. "Fetching GitHub signals"     ← shows when github signal starts
2. "Analyzing 90-day issues"     ← shows when issue classification starts  
3. "Checking competition"        ← shows when serper call starts
4. "Finding HN demand posts"     ← shows when hn fetch starts
5. "Scoring opportunities"       ← shows when scoring starts
6. "Generating top ideas"        ← shows when Claude call starts
7. "Running decision engine"     ← shows only on paid tier
```

Each step: pending (gray) → running (blue spinner) → complete (green check)

---

### 7.3 TopIdeasList Component

**File:** `components/analysis/TopIdeasList.tsx`

**Display per idea:**
```
Rank badge (#1, #2...)
Idea name (bold)
Category badge (managed_hosting, etc.)
One-liner (gray text)
Signal evidence (2-3 bullet points with numbers)
Target customer
Rough pricing
Build complexity indicator (1-5 dots)
```

**For free users:** Show all 5 ideas
**Gate:** "See which one to build → Unlock Decision ($29 report or subscribe)"

---

### 7.4 VerdictCard Component

**File:** `components/analysis/VerdictCard.tsx`

**Layout:**
```
┌─────────────────────────────────────────────┐
│  ✅ BUILD  ·  8.7/10 confidence             │
│  Signal score: 10.2/12                      │
│─────────────────────────────────────────────│
│  Best idea: [name]                           │
│  [reasoning paragraph]                       │
│─────────────────────────────────────────────│
│  SCORES                                      │
│  Demand      ████████░░  8.2                │
│  Founder Fit ██████░░░░  6.1                │
│  Crowdedness ████████░░  8.0  ← open market │
│  WTP         ███████░░░  7.4                │
│  GTM Fit     ████████░░  7.9                │
│─────────────────────────────────────────────│
│  Why not the others:                         │
│  • [Idea 2]: [reason]                        │
│  • [Idea 3]: [reason]                        │
│  • [Idea 4]: [reason]                        │
│  • [Idea 5]: [reason]                        │
│─────────────────────────────────────────────│
│  [Open Build Room →]  ← only if BUILD       │
└─────────────────────────────────────────────┘
```

**Colors:**
- BUILD: green border + green badge
- SKIP: red border + red badge
- WATCH: yellow border + yellow badge

---

### 7.5 ValidationPlan Component

**File:** `components/analysis/ValidationPlan.tsx`

```
Day 1  [action]   Goal: [goal]   ✓ when: [signal]
Day 2  [action]   Goal: [goal]   ✓ when: [signal]
...
Day 7  DECISION POINT: continue | pivot | stop
```

Each day is a card. Days 1-4 are collapsed by default, Day 7 is highlighted.

---

### 7.6 BuildRoom Component

**File:** `components/build-room/BuildRoom.tsx`

**Tab structure:**
```
[Decision] [Blueprint] [Build Tasks] [Launch] [Financials]
```

Each tab loads independently. Shows skeleton while generating.
Tab content only available after human approval gate on previous tab.

**Approval flow:**
```
Blueprint tab: shows "Approve this blueprint" button
  → clicking approves and unlocks Launch tab
Launch tab: shows "Approve launch assets" button  
  → clicking approves (user controls any posting)
```

No tab auto-posts or auto-deploys anything.

---

### 7.7 FinancialModel Component

**File:** `components/build-room/FinancialModel.tsx`

**Interactive sliders:**
- Hourly rate: $50–$500 (default $150)
- Weeks to build: 2–24 (default from analysis)
- Average monthly price: $19–$999
- Customers per week: 0.5–10
- Monthly churn: 1%–15%

**Auto-calculated outputs:**
```
One-time build cost: $X
Monthly fixed costs: $X
Break-even: X customers (Month Y)
Conservative 12-mo MRR: $X
Realistic 12-mo MRR: $X
Optimistic 12-mo MRR: $X
```

Re-calculates on every slider change. No submit button.

---

## Section 8 — Homepage

### 8.1 Layout

```
Hero:
  "From signal to shipped."
  "StackSignal finds the best business idea in any 
   GitHub repo, package, or ecosystem — then tells 
   you which one is actually worth building."
  [Input box — large, centered]

Free strip:
  "Free: top 5 ideas from any repo"
  "Paid: which one to build, with 7-day validation plan"

Today's top opportunities (live leaderboard):
  Showing top 5 from daily analysis run
  Each with: name, verdict badge, signal score
  Click → public report page

Social proof:
  Count of analyses run today
  Most recent BUILD verdict (auto-updated)
```

### 8.2 Daily Leaderboard

**Inngest job:** `scheduledAnalysis` — runs daily at 6am UTC

**Logic:**
- Fetch top 20 repos from GitHub trending (past week)
- Run analysis on each
- Store results
- Surface top 5 by signal score on homepage
- Auto-generate Twitter thread from #1 result

---

## Section 9 — Inngest Jobs

### 9.1 scheduledAnalysis

```typescript
// inngest/functions/scheduledAnalysis.ts
export const scheduledAnalysis = inngest.createFunction(
  { id: "scheduled-analysis", name: "Daily Signal Analysis" },
  { cron: "0 6 * * *" },  // 6am UTC daily
  async ({ step }) => {
    const repos = await step.run("fetch-trending", () => fetchTrendingRepos(20))
    
    const results = await step.run("analyze-all", () =>
      Promise.all(repos.map(repo => analyzeRepo(repo)))
    )
    
    await step.run("update-leaderboard", () => updateLeaderboard(results))
    
    await step.run("generate-tweet", () =>
      generateDailyTweet(results[0])  // best result
    )
  }
)
```

### 9.2 generateBuildRoom

```typescript
// inngest/functions/generateBuildRoom.ts
export const generateBuildRoom = inngest.createFunction(
  { id: "generate-build-room" },
  { event: "analysis/build-room.requested" },
  async ({ event, step }) => {
    const { analysisId } = event.data

    const blueprint = await step.run("generate-blueprint", () =>
      generateBlueprint(analysisId)
    )
    
    const schema = await step.run("generate-schema", () =>
      generatePrismaSchema(analysisId, blueprint)
    )

    const tasks = await step.run("generate-tasks", () =>
      generateBuildTasks(analysisId, blueprint)
    )

    const launch = await step.run("generate-launch", () =>
      generateLaunchAssets(analysisId)
    )

    const financial = await step.run("generate-financial", () =>
      generateFinancialModel(analysisId)
    )

    await step.run("mark-complete", () =>
      markBuildRoomComplete(analysisId)
    )
  }
)
```

---

## Section 10 — Claude Code Prompt Sequence

Use these prompts in order. Each is a separate Claude Code session.

### Prompt 1: Database Setup

```
Using the Prisma schema in Section 2.1 of the StackSignal FRD, set up the 
database layer for this project.

Tasks:
1. Initialize a new Next.js 14 project with TypeScript and Tailwind
2. Install: prisma, @prisma/client, @supabase/supabase-js
3. Create prisma/schema.prisma with the exact schema from the FRD
4. Set up lib/prisma.ts singleton client
5. Run npx prisma generate
6. Create a test script that creates one User and one Analysis record

Accept these env vars from .env.local (create .env.example with all vars listed)
```

### Prompt 2: GitHub Signal Fetcher

```
Implement the GitHub signal fetcher as specified in Section 3.1 of the 
StackSignal FRD.

File: lib/signals/github.ts

Requirements:
- Function signature: fetchGitHubSignals(repoUrl: string): Promise<GitHubSignals | SignalError>
- Parse any GitHub URL format to owner/repo
- Fetch in parallel: repo metadata + issues (last 90 days)
- Classify issues by keyword lists from the FRD
- Calculate velocityTrend by comparing last 30 days to prior 30 days
- Cache result in Supabase SignalTarget table (24-hour TTL)
- Return error object (not throw) for invalid repos

Write tests for:
- Valid GitHub URL formats (full URL, owner/repo, .git suffix)
- Invalid repo returns error object not exception
- Issue classification correctly identifies hosting keywords
```

### Prompt 3: npm + HN Signal Fetchers

```
Implement the npm/PyPI and HN signal fetchers as specified in 
Sections 3.2 and 3.3 of the StackSignal FRD.

Files:
- lib/signals/packages.ts  (npm + PyPI)
- lib/signals/hn.ts        (HN Algolia demand)

Both should return typed objects matching the interfaces in the FRD.
Both should return error objects not throw exceptions.
HN fetcher must filter to last 12 months only.
```

### Prompt 4: Scoring Engine

```
Implement the scoring engine as specified in Section 4 of the 
StackSignal FRD.

Files:
- lib/scoring/signals.ts   (0-12 signal score)
- lib/scoring/ideas.ts     (9-dimension idea scores + verdict)

The scoring formula must match exactly:
- Signal score: use the exact tier thresholds from Section 4.1
- Idea scores: use the exact composite weighting from Section 4.2
- Verdict: SKIP if crowdedness < 3 OR platformRisk > 8
- Verdict: BUILD if composite >= 7.0 AND crowdedness >= 5

Write unit tests for edge cases:
- crowdedness = 2.9 → always SKIP
- platformRisk = 8.1 → always SKIP
- composite = 7.0 AND crowdedness = 5 → BUILD
- composite = 6.9 → WATCH
```

### Prompt 5: Opportunity + Decision Engine

```
Implement the opportunity and decision engine as specified in 
Section 5 of the StackSignal FRD.

Files:
- lib/agents/opportunityEngine.ts
- lib/agents/decisionEngine.ts
- lib/agents/prompts.ts  (store all prompts here)

Use: @anthropic-ai/sdk
Model: claude-sonnet-4-20250514

The opportunity engine must:
- Return exactly 5 ideas (parse and validate Claude output)
- Retry once if Claude returns invalid JSON
- Classify each idea into the taxonomy from Section 5.1

The decision engine must:
- Score all 5 ideas using Section 4.2 scoring
- Return exactly 1 best idea
- Return skip reasons for all other 4 ideas
- Return 7-day validation plan matching the rules in Section 5.2

Test with temporalio/temporal as input. Expected: BUILD verdict.
```

### Prompt 6: Analyze API Route

```
Implement the /api/analyze streaming route as specified in 
Section 6.1 of the StackSignal FRD.

File: app/api/analyze/route.ts

Use server-sent events for streaming.
Each step emits an event with the signal type and result.
Check credits before starting, deduct after completion.
Cache check: same input analyzed in 24h → return cached.
Anonymous user: 1 free analysis then 401.

Wire up the full pipeline:
1. Detect input type
2. Fetch relevant signals (in parallel where possible)
3. Calculate signal score
4. Generate top 5 ideas (free output)
5. If paid tier: run decision engine

Test: POST to this route with temporalio/temporal URL
Expected: streaming response with all events firing correctly
```

### Prompt 7: Core UI Components

```
Implement the UI components specified in Section 7 of the 
StackSignal FRD.

Build in this order:
1. AnalysisInput (Section 7.1)
2. ProgressSteps (Section 7.2)  
3. TopIdeasList (Section 7.3)
4. VerdictCard (Section 7.4)
5. ValidationPlan (Section 7.5)

Wire AnalysisInput to the /api/analyze streaming route.
ProgressSteps should update as streaming events arrive.
TopIdeasList shows when ideas_ready event fires.
VerdictCard shows when decision_ready event fires.

Use Tailwind for all styling. No external UI libraries except shadcn/ui.
Colors: BUILD=green, SKIP=red, WATCH=amber.
```

### Prompt 8: Homepage + Leaderboard

```
Implement the homepage as specified in Section 8 of the 
StackSignal FRD.

File: app/(public)/page.tsx

Include:
- Hero with AnalysisInput component centered
- "Free: ideas, Paid: decision" value proposition
- Today's top opportunities section (static for now, empty state OK)
- Analysis count display (query from database)

Also implement the Inngest scheduled job from Section 9.1.
For now, run it manually to populate initial leaderboard data.
```

### Prompt 9: Build Room

```
Implement the Build Room as specified in Section 7.6 of the 
StackSignal FRD.

Files:
- app/(auth)/build-room/[id]/page.tsx
- components/build-room/BuildRoom.tsx
- components/build-room/FinancialModel.tsx

Tab content generation uses the Inngest job from Section 9.2.
Each tab shows a skeleton while generating.
Approval gates: blueprint approved → launch tab unlocks.
Financial model sliders auto-recalculate with no submit button.

The Build Room should only be accessible when:
- Analysis verdict is BUILD
- User is logged in (use Supabase Auth)
```

### Prompt 10: Payments + Credits

```
Implement Stripe subscription and credit system.

File: app/api/webhooks/stripe/route.ts

Plans:
- FREE: 3 credits/month, reset monthly
- BUILDER ($19/mo): 30 credits/month
- PRO ($49/mo): 100 credits/month

Credit costs:
- Basic analysis (ideas only): 1 credit
- Full decision analysis: 5 credits
- Build Room generation: 10 credits

Stripe webhook handles:
- checkout.session.completed → upgrade plan + add credits
- customer.subscription.deleted → downgrade to FREE
- invoice.payment_failed → email via Resend

Create Stripe products and price IDs first.
Test with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Section 11 — Acceptance Tests (Full System)

Run these manually after all prompts are complete:

```
E2E Test 1: Free analysis flow
  1. Open homepage as anonymous user
  2. Enter "temporalio/temporal"
  3. Progress steps should show all signals fetching
  4. Top 5 ideas should appear
  5. Decision verdict should be gated (shows upgrade prompt)
  6. Email capture should appear after results
  PASS: All 5 steps complete without errors

E2E Test 2: Paid analysis flow
  1. Sign up as new user (Supabase Auth)
  2. Subscribe to Builder plan (Stripe test mode)
  3. Enter "n8n-io/n8n"
  4. Full decision engine should run
  5. BUILD verdict with scores should appear
  6. "Open Build Room" button should be available
  7. Build Room should generate all 5 tabs
  PASS: Full flow completes, Build Room has content

E2E Test 3: SKIP verdict
  1. Enter a clearly saturated opportunity (e.g., "project management SaaS")
  2. Decision engine should return SKIP
  3. SKIP reasons for all ideas should be specific
  4. No Build Room option should appear
  PASS: SKIP fires with specific reasoning

E2E Test 4: Credit deduction
  1. Free user: run 3 analyses → 4th should be blocked
  2. Builder user: run 6 full decisions (30 credits ÷ 5) → 7th blocked
  3. Credits shown in UI update after each analysis
  PASS: Credit system prevents overuse

E2E Test 5: Stripe webhook
  1. Use Stripe CLI to trigger checkout.session.completed
  2. User plan should update to BUILDER in database
  3. Credits should increase to 30
  PASS: Webhook processed correctly
```

---

## Section 12 — Things Claude Code Must Not Do

- Do not use `any` TypeScript type except where explicitly marked
- Do not use `console.log` in production code (use a logger)
- Do not hardcode API keys (always use env vars)
- Do not skip error handling on external API calls
- Do not auto-post to Twitter or any platform automatically
- Do not store raw GitHub issue content verbatim (store classifications only)
- Do not generate competitor data without search result source
- Do not allow Build Room generation if verdict is not BUILD
- Do not deduct credits if analysis fails
- Do not skip the approval gate on Build Room tabs

---

*FRD Version 1.0 | StackSignal | May 2026*
*Ready for Claude Code implementation*
