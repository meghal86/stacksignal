import type { Analysis } from "@prisma/client";

export type SignalContext = {
  opportunityName?: string;
  verdict?: string | null;
  confidence?: number | null;
  verdictReasoning?: string | null;

  signals: {
    github: {
      stars?: number;
      hostingRequestsLast90d?: number;
      enterpriseRequests?: number;
      topIssues?: string[];
      velocityTrend?: string;
      lastCommitDays?: number;
    };
    packages: {
      weeklyDownloads?: number;
      ecosystem?: string;
    };
    hn: {
      unsolvedPosts?: number;
      topPosts?: Array<{ title: string; points?: number; url?: string }>;
    };
    competition?: {
      crowdednessScore?: number;
      competitors?: Array<{ name: string; price?: string }>;
    };
  };

  market: {
    icp?: string;
    pricing?: string;
    buildWeeks?: number;
    competitionGap?: string;
    skipRisks?: Array<{ severity: string; risk: string }>;
  };

  founder?: unknown;

  scores: {
    signal?: number;
    demand?: number | null;
    crowdedness?: number | null;
    founderFit?: number | null;
    wtp?: number | null;
  };
};

type AnalysisLike = Pick<
  Analysis,
  | "bestIdea"
  | "verdict"
  | "confidence"
  | "verdictReasoning"
  | "signalsRaw"
  | "founderProfile"
  | "demandScore"
  | "crowdednessScore"
  | "founderFitScore"
  | "wtpScore"
>;

export function buildSignalContext(analysis: AnalysisLike): SignalContext {
  const idea = (analysis.bestIdea ?? {}) as any;
  const signals = (analysis.signalsRaw ?? {}) as any;

  const github = signals?.github ?? {};
  const pkg = signals?.package ?? {};
  const hn = signals?.hn ?? {};
  const competition = signals?.competition ?? {};

  return {
    opportunityName: idea?.name,
    verdict: analysis.verdict,
    confidence: analysis.confidence,
    verdictReasoning: analysis.verdictReasoning,

    signals: {
      github: {
        stars: github.stars,
        hostingRequestsLast90d: github.hostingRequestsLast90d,
        enterpriseRequests: github.enterpriseRequestsLast90d,
        topIssues: github.topHostingIssues,
        velocityTrend: github.velocityTrend,
        lastCommitDays: github.lastCommitDays,
      },
      packages: {
        weeklyDownloads: pkg.weeklyDownloads,
        ecosystem: pkg.ecosystem,
      },
      hn: {
        unsolvedPosts: hn.unsolvedPosts,
        topPosts: hn.topPosts,
      },
      competition: {
        crowdednessScore: competition.crowdednessScore,
        competitors: competition.competitors,
      },
    },

    market: {
      icp: idea?.targetCustomer,
      pricing: idea?.roughPricing,
      buildWeeks: idea?.buildWeeks,
      competitionGap: idea?.marketGap,
      skipRisks: idea?.skipRisks,
    },

    founder: analysis.founderProfile,

    scores: {
      signal: signals?.score ?? signals?.signalScore?.total,
      demand: analysis.demandScore,
      crowdedness: analysis.crowdednessScore,
      founderFit: analysis.founderFitScore,
      wtp: analysis.wtpScore,
    },
  };
}

export function formatContextForAgent(ctx: SignalContext): string {
  const g = ctx.signals.github;
  const p = ctx.signals.packages;
  const h = ctx.signals.hn;
  const topIssue = g.topIssues?.[0] ?? "n/a";
  const risks =
    ctx.market.skipRisks
      ?.map((r) => `  ${r.severity}: ${r.risk}`)
      .join("\n") ?? "  (none recorded)";

  return `
=== SIGNAL INTELLIGENCE (verified, fetched live) ===

OPPORTUNITY: ${ctx.opportunityName ?? "n/a"}
VERDICT: ${ctx.verdict ?? "n/a"} (${ctx.confidence ?? "?"}/10 confidence)

MARKET SIGNALS:
  GitHub stars: ${g.stars?.toLocaleString() ?? "n/a"}
  Hosting issues (90 days): ${g.hostingRequestsLast90d ?? "n/a"}
  Enterprise requests: ${g.enterpriseRequests ?? "n/a"}
  Top issue: "${topIssue}"
  npm/PyPI weekly downloads: ${p.weeklyDownloads?.toLocaleString() ?? "n/a"}
  Unanswered HN posts: ${h.unsolvedPosts ?? "n/a"}

MARKET GAP:
  ${ctx.market.competitionGap ?? "n/a"}

TARGET CUSTOMER:
  ${ctx.market.icp ?? "n/a"}

PRICING RANGE:
  ${ctx.market.pricing ?? "n/a"}

BUILD COMPLEXITY:
  ${ctx.market.buildWeeks ?? "?"} weeks for solo founder

FOUNDER BACKGROUND:
  ${ctx.founder ? JSON.stringify(ctx.founder) : "(no profile)"}

RISK SIGNALS:
${risks}

=== END SIGNAL CONTEXT ===
`.trim();
}
