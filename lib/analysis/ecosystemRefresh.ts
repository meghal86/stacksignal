import { Prisma, type TargetType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateDecision } from "@/lib/agents/decisionEngine";
import { generateTopIdeas, type TopIdea } from "@/lib/agents/opportunityEngine";
import { calculateSignalScore, type SignalMetrics } from "@/lib/scoring/signals";
import { fetchCompetition } from "@/lib/signals/competition";
import { discoverTopStackRepos, type DiscoveredRepo } from "@/lib/signals/githubDiscovery";
import { fetchGitHubSignals, type GitHubSignals } from "@/lib/signals/github";
import { fetchHNDemand, type HNSignals } from "@/lib/signals/hn";
import { isSignalError } from "@/lib/analysis/engine";

type RepoSignalBundle = {
  repo: DiscoveredRepo;
  github: GitHubSignals | { error: unknown; message?: string };
  hn: HNSignals | { error: unknown; message?: string };
  competition: Awaited<ReturnType<typeof fetchCompetition>>;
};

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function slugDate() {
  return new Date().toISOString().slice(0, 10);
}

function aggregateMetrics(bundles: RepoSignalBundle[]): SignalMetrics {
  const githubSignals = bundles.map((bundle) => bundle.github).filter((signal): signal is GitHubSignals => !isSignalError(signal));
  const hnSignals = bundles.map((bundle) => bundle.hn).filter((signal): signal is HNSignals => !isSignalError(signal));
  const competitionSignals = bundles
    .map((bundle) => bundle.competition)
    .filter((signal): signal is Exclude<RepoSignalBundle["competition"], { error: string }> => !("error" in signal));

  const latestCommitDays = githubSignals
    .map((signal) => signal.lastCommitDays)
    .filter((value) => Number.isFinite(value));

  const crowdedness = competitionSignals
    .map((signal) => signal.crowdednessScore)
    .filter((value) => Number.isFinite(value));

  return {
    stars: githubSignals.reduce((max, signal) => Math.max(max, signal.stars), 0),
    hostingRequestsLast90d: githubSignals.reduce((sum, signal) => sum + signal.hostingRequestsLast90d, 0),
    enterpriseRequestsLast90d: githubSignals.reduce((sum, signal) => sum + signal.enterpriseRequestsLast90d, 0),
    unsolvedPosts: hnSignals.reduce((sum, signal) => sum + signal.unsolvedPosts, 0),
    crowdednessScore: crowdedness.length ? crowdedness.reduce((sum, value) => sum + value, 0) / crowdedness.length : undefined,
    lastCommitDays: latestCommitDays.length ? Math.min(...latestCommitDays) : undefined,
    velocityTrend: githubSignals.some((signal) => signal.velocityTrend === "accelerating") ? "accelerating" : "stable",
    skipSignalsFound: githubSignals.flatMap((signal) => signal.skipSignalsFound),
    isArchived: githubSignals.every((signal) => signal.isArchived),
  };
}

function fallbackIdeas(bundles: RepoSignalBundle[]): TopIdea[] {
  return bundles.slice(0, 5).map((bundle, index) => {
    const name = !isSignalError(bundle.github) ? bundle.github.name : bundle.repo.fullName;
    return {
      rank: index + 1,
      name: `${bundle.repo.categoryLabel} gap for ${name}`,
      category: index === 0 ? "managed_hosting" : index === 1 ? "developer_tools" : index === 2 ? "analytics_layer" : index === 3 ? "migration_toolkit" : "vertical_saas",
      oneLiner: `A focused product built around unresolved demand in ${bundle.repo.categoryLabel}.`,
      signalEvidence: [
        `${bundle.repo.stars.toLocaleString()} GitHub stars`,
        !isSignalError(bundle.github) ? `${bundle.github.hostingRequestsLast90d} hosting requests in 90 days` : "GitHub details unavailable",
        !isSignalError(bundle.hn) ? `${bundle.hn.unsolvedPosts} unresolved HN demand posts` : "HN demand unavailable",
      ],
      targetCustomer: "Technical founders and engineering teams adopting this stack",
      roughPricing: "$99-499/month",
      buildWeeks: 4 + index,
      skipRisk: "The repo may be popular without a painful enough commercial workflow.",
    };
  });
}

async function generateIdeasFromBundles(bundles: RepoSignalBundle[]) {
  try {
    const ideas = await generateTopIdeas({
      signals: {
        github: {
          name: "5-repo ecosystem refresh",
          stars: bundles.reduce((sum, bundle) => sum + (!isSignalError(bundle.github) ? bundle.github.stars : bundle.repo.stars), 0),
          forks: bundles.reduce((sum, bundle) => sum + (!isSignalError(bundle.github) ? bundle.github.forks : 0), 0),
          openIssues: bundles.reduce((sum, bundle) => sum + (!isSignalError(bundle.github) ? bundle.github.openIssues : 0), 0),
          language: "Mixed",
          description: `Live refresh across ${bundles.map((bundle) => `${bundle.repo.categoryLabel}: ${bundle.repo.fullName}`).join("; ")}`,
          isArchived: false,
          lastCommitDays: Math.min(...bundles.map((bundle) => (!isSignalError(bundle.github) ? bundle.github.lastCommitDays : 999))),
          starsLast30d: bundles.reduce((sum, bundle) => sum + (!isSignalError(bundle.github) ? bundle.github.starsLast30d : 0), 0),
          velocityTrend: bundles.some((bundle) => !isSignalError(bundle.github) && bundle.github.velocityTrend === "accelerating") ? "accelerating" : "stable",
          hostingRequestsLast90d: bundles.reduce((sum, bundle) => sum + (!isSignalError(bundle.github) ? bundle.github.hostingRequestsLast90d : 0), 0),
          enterpriseRequestsLast90d: bundles.reduce((sum, bundle) => sum + (!isSignalError(bundle.github) ? bundle.github.enterpriseRequestsLast90d : 0), 0),
          skipSignalsFound: bundles.flatMap((bundle) => (!isSignalError(bundle.github) ? bundle.github.skipSignalsFound : [])),
          topHostingIssues: bundles.flatMap((bundle) => (!isSignalError(bundle.github) ? bundle.github.topHostingIssues : [])).slice(0, 10),
          topEnterpriseIssues: bundles.flatMap((bundle) => (!isSignalError(bundle.github) ? bundle.github.topEnterpriseIssues : [])).slice(0, 10),
        },
        hn: {
          totalPosts: bundles.reduce((sum, bundle) => sum + (!isSignalError(bundle.hn) ? bundle.hn.totalPosts : 0), 0),
          unsolvedPosts: bundles.reduce((sum, bundle) => sum + (!isSignalError(bundle.hn) ? bundle.hn.unsolvedPosts : 0), 0),
          topPosts: bundles.flatMap((bundle) => (!isSignalError(bundle.hn) ? bundle.hn.topPosts : [])).slice(0, 10),
        },
        competition: {
          competitors: bundles.flatMap((bundle) => ("error" in bundle.competition ? [] : bundle.competition.competitors)).slice(0, 10),
          gapFound: bundles.some((bundle) => !("error" in bundle.competition) && bundle.competition.gapFound),
          gapDescription: "Aggregated competition scan across the refreshed stack categories.",
          crowdednessScore: 6,
          marketValidation: "Multiple stack categories show active open-source adoption.",
        },
      },
    });
    return ideas;
  } catch (error) {
    console.error("[ecosystemRefresh] Idea generation failed, using fallback", error);
    return fallbackIdeas(bundles);
  }
}

export async function runEcosystemRefresh(userId: string) {
  const repos = await discoverTopStackRepos(5);
  if (!repos.length) {
    throw new Error("No GitHub repositories discovered for stack refresh.");
  }

  const bundles: RepoSignalBundle[] = await Promise.all(
    repos.map(async (repo) => {
      const [github, hn, competition] = await Promise.all([
        fetchGitHubSignals(repo.fullName),
        fetchHNDemand(repo.fullName),
        fetchCompetition(`${repo.categoryLabel} ${repo.fullName}`),
      ]);

      return { repo, github, hn, competition };
    })
  );

  const signalScore = calculateSignalScore(aggregateMetrics(bundles));
  const topIdeas = await generateIdeasFromBundles(bundles);
  const decision = await generateDecision({ topIdeas, signalScore }).catch((error) => {
    console.error("[ecosystemRefresh] Decision generation failed", error);
    return null;
  });

  const identifier = `ecosystem-refresh-${Date.now()}`;
  const displayName = `Stack refresh ${slugDate()}`;
  const signalTarget = await prisma.signalTarget.create({
    data: {
      type: "DOMAIN_SEARCH" satisfies TargetType,
      identifier,
      displayName,
      signalData: toInputJson({
        refreshType: "stack_categories_top_5",
        repositories: repos,
        bundles,
        signalScore,
      }),
      signalScore: signalScore.total,
      lastFetched: new Date(),
    },
  });

  const analysis = await prisma.analysis.create({
    data: {
      user: userId ? { connect: { id: userId } } : undefined,
      target: { connect: { id: signalTarget.id } },
      rawInput: displayName,
      topIdeas: toInputJson(topIdeas),
      signalsRaw: toInputJson({ bundles, signalScore }),
      bestIdea: toInputJson(decision?.bestIdea ?? topIdeas[0]),
      verdict: decision?.verdict,
      confidence: decision?.confidence,
      verdictReasoning:
        decision?.reasoning ??
        `Refreshed ${repos.length} live GitHub repositories across AI, devtools, backend, frontend, and observability categories.`,
      skipReasons: toInputJson(decision?.skipReasons ?? []),
      validationPlan: toInputJson(decision?.validationPlan ?? []),
      mvpScope: toInputJson(decision?.mvpScope ?? null),
      demandScore: decision?.scores?.demand,
      founderFitScore: decision?.scores?.founderFit,
      crowdednessScore: decision?.scores?.crowdedness,
      wtpScore: decision?.scores?.wtp,
      gtmFitScore: decision?.scores?.gtmFit,
      buildComplexity: decision?.scores?.buildComplexity,
      speedToRevenue: decision?.scores?.speedToRevenue,
      moatScore: decision?.scores?.moat,
      platformRisk: decision?.scores?.platformRisk,
      creditsCost: 1,
      isPublic: true,
    },
  });

  return {
    analysis,
    repos,
    signalScore,
    ideas: topIdeas,
  };
}
