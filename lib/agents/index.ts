import { fetchGitHubSignals, GitHubSignals } from "../signals/github"
import { fetchPackageSignals, PackageSignals } from "../signals/packages"
import { fetchHNDemand, HNSignals } from "../signals/hn"
import { calculateSignalScore } from "../scoring/signals"
import { generateTopIdeas, TopIdea } from "./opportunityEngine"
import { generateDecision, Decision } from "./decisionEngine"

export interface FounderProfile {
  background: string[]
  industries: string[]
  timeline: string
}

export interface FullAnalysisResult {
  topIdeas: TopIdea[]
  signalScore: any
  decision: Decision | null
  signals: { 
    github?: GitHubSignals | null, 
    package?: PackageSignals | null, 
    hn?: HNSignals | null 
  }
}

export async function runFullAnalysis(params: {
  githubUrl?: string
  packageName?: string
  packageEcosystem?: "npm" | "pypi"
  rawInput: string
  founderProfile?: FounderProfile
  tier: "free" | "paid"
  mockSignals?: any
}): Promise<FullAnalysisResult> {
  let github = params.mockSignals?.github || null;
  let pkg = params.mockSignals?.package || null;
  let hn = params.mockSignals?.hn || null;

  if (!params.mockSignals) {
    const [githubResult, pkgResult, hnResult] = await Promise.allSettled([
      params.githubUrl ? fetchGitHubSignals(params.githubUrl) : Promise.resolve(null),
      params.packageName && params.packageEcosystem ? fetchPackageSignals(params.packageName, params.packageEcosystem) : Promise.resolve(null),
      fetchHNDemand(params.rawInput)
    ])

    github = githubResult.status === "fulfilled" && githubResult.value && !('error' in githubResult.value) ? githubResult.value as GitHubSignals : null;
    pkg = pkgResult.status === "fulfilled" && pkgResult.value && !('error' in pkgResult.value) ? pkgResult.value as PackageSignals : null;
    hn = hnResult.status === "fulfilled" && hnResult.value && !('error' in hnResult.value) ? hnResult.value as HNSignals : null;
  }

  const signalMetrics = {
    weeklyDownloads: pkg?.weeklyDownloads,
    stars: github?.stars,
    hostingRequestsLast90d: github?.hostingRequestsLast90d,
    enterpriseRequestsLast90d: github?.enterpriseRequestsLast90d,
    unsolvedPosts: hn?.unsolvedPosts,
    lastCommitDays: github?.lastCommitDays,
    velocityTrend: github?.velocityTrend,
    skipSignalsFound: github?.skipSignalsFound,
    isArchived: github?.isArchived
  };

  const signalScore = calculateSignalScore(signalMetrics);

  const signals = { github, package: pkg, hn };

  const topIdeas = await generateTopIdeas({
    signals: signals as any,
    founderProfile: params.founderProfile
  });

  let decision: Decision | null = null;
  if (params.tier === "paid") {
    decision = await generateDecision({
      topIdeas,
      signalScore,
      founderProfile: params.founderProfile
    });
  }

  return {
    topIdeas,
    signalScore,
    decision,
    signals
  };
}
