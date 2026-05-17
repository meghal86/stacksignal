import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { type AnalysisInputType } from "@/lib/analysis/input";
import { fetchGitHubSignals } from "@/lib/signals/github";
import { fetchPackageSignals } from "@/lib/signals/packages";
import { fetchHNDemand } from "@/lib/signals/hn";
import { fetchCompetition } from "@/lib/signals/competition";
import { calculateSignalScore, type SignalMetrics } from "@/lib/scoring/signals";
import { generateTopIdeas } from "@/lib/agents/opportunityEngine";
import { generateDecision } from "@/lib/agents/decisionEngine";
import { generateBuildRoomContent } from "@/lib/agents/buildRoomEngine";
import { saveCompletedAnalysis } from "@/lib/api/analyze-helpers";

export type AggregateSignals = {
  github?: Awaited<ReturnType<typeof fetchGitHubSignals>>;
  package?: Awaited<ReturnType<typeof fetchPackageSignals>>;
  hn?: Awaited<ReturnType<typeof fetchHNDemand>>;
  competition?: Awaited<ReturnType<typeof fetchCompetition>>;
};

export function isSignalError(value: unknown): value is { error: unknown; message?: string } {
  return typeof value === "object" && value !== null && "error" in value;
}

export function buildSignalMetrics(signals: any): SignalMetrics {
  const github = signals?.github && !isSignalError(signals.github) 
    ? signals.github 
    : (signals?.stars !== undefined ? signals : undefined);
    
  const pkg = signals?.package && !isSignalError(signals.package) 
    ? signals.package 
    : (signals?.weeklyDownloads !== undefined ? signals : undefined);
    
  const hn = signals?.hn && !isSignalError(signals.hn) 
    ? signals.hn 
    : (signals?.unsolvedPosts !== undefined ? signals : undefined);
    
  const competition =
    signals?.competition &&
    !isSignalError(signals.competition) &&
    "crowdednessScore" in signals.competition
      ? signals.competition
      : (signals?.crowdednessScore !== undefined ? signals : undefined);

  return {
    weeklyDownloads: pkg?.weeklyDownloads,
    stars: github?.stars,
    hostingRequestsLast90d: github?.hostingRequestsLast90d,
    enterpriseRequestsLast90d: github?.enterpriseRequestsLast90d,
    unsolvedPosts: hn?.unsolvedPosts,
    crowdednessScore: competition?.crowdednessScore,
    lastCommitDays: github?.lastCommitDays,
    velocityTrend: github?.velocityTrend,
    skipSignalsFound: github?.skipSignalsFound,
    isArchived: github?.isArchived,
  };
}

export async function runFullAnalysis({
  userId,
  normalizedInput,
  inputType,
  emitDecision,
  onProgress
}: {
  userId: string;
  normalizedInput: string;
  inputType: AnalysisInputType;
  emitDecision?: boolean;
  onProgress?: (event: string, data: any) => void;
}) {
  const signals: AggregateSignals = {};
  const sendEvent = (event: string, data: any) => onProgress?.(event, data);

  // 1. Fetch Signals
  if (inputType === "github_repo") {
    sendEvent("signal_start", { stepId: "github_signals" });
    const githubSignals = await fetchGitHubSignals(normalizedInput);
    signals.github = githubSignals;
    if (!isSignalError(githubSignals)) {
      sendEvent("signal_complete", { stepId: "github_signals", summary: `${githubSignals.stars} stars` });
      sendEvent("signal_complete", { stepId: "github_issues", summary: `${githubSignals.hostingRequestsLast90d} hosting / ${githubSignals.enterpriseRequestsLast90d} enterprise` });
    }
  }

  if (inputType === "npm_package" || inputType === "pypi_package") {
    sendEvent("signal_start", { stepId: "package_downloads" });
    const packageSignals = await fetchPackageSignals(normalizedInput, inputType === "npm_package" ? "npm" : "pypi");
    signals.package = packageSignals;
    if (!isSignalError(packageSignals)) {
      sendEvent("signal_complete", { stepId: "package_downloads", summary: `${packageSignals.weeklyDownloads} weekly downloads` });
    }
  }

  const demandQuery = !isSignalError(signals.github) && signals.github?.name
    ? signals.github.name
    : !isSignalError(signals.package) && signals.package?.name
      ? signals.package.name
      : normalizedInput;

  sendEvent("signal_start", { stepId: "hn_demand" });
  const hnSignals = await fetchHNDemand(demandQuery);
  signals.hn = hnSignals;
  if (!isSignalError(hnSignals)) {
    sendEvent("signal_complete", { stepId: "hn_demand", summary: `${hnSignals.unsolvedPosts} unsolved posts` });
  }

  sendEvent("signal_start", { stepId: "competition_check" });
  const competitionSignals = await fetchCompetition(demandQuery);
  signals.competition = competitionSignals;
  if (!isSignalError(competitionSignals)) {
    sendEvent("signal_complete", { stepId: "competition_check", summary: `${(competitionSignals as any).competitors?.length ?? 0} competitors found` });
  }

  // 2. Scoring
  sendEvent("signal_start", { stepId: "scoring" });
  const signalScore = calculateSignalScore(buildSignalMetrics(signals));
  sendEvent("signal_complete", { stepId: "scoring", summary: `${signalScore.total.toFixed(1)} / 12` });

  // 3. Ideas Generation
  sendEvent("signal_start", { stepId: "top_ideas" });
  const topIdeas = await generateTopIdeas({
    signals: {
      github: signals.github && !isSignalError(signals.github) ? signals.github : undefined,
      package: signals.package && !isSignalError(signals.package) ? signals.package : undefined,
      hn: signals.hn && !isSignalError(signals.hn) ? signals.hn : undefined,
      competition: signals.competition && !isSignalError(signals.competition) ? signals.competition : undefined,
    }
  });
  sendEvent("signal_complete", { stepId: "top_ideas", summary: `${topIdeas.length} ideas generated` });
  sendEvent("ideas_ready", { ideas: topIdeas, signalScore });

  // 4. Decision Engine
  if (emitDecision !== false) sendEvent("decision_start", {});
  const fullDecision = await generateDecision({
    topIdeas,
    signalScore,
  });
  const decision = {
    ...fullDecision,
    signalScoreTotal: signalScore.total,
    targetName: normalizedInput,
  };
  if (emitDecision !== false) sendEvent("decision_ready", { decision });

  // 5. Database Persistence
  const targetType = inputType === "github_repo" ? "GITHUB_REPO" : inputType === "npm_package" ? "NPM_PACKAGE" : "PYPI_PACKAGE";
  
  const signalTarget = await prisma.signalTarget.upsert({
    where: { type_identifier: { type: targetType as any, identifier: normalizedInput } },
    update: {
      displayName: normalizedInput,
      signalData: signals as any,
      signalScore: signalScore.total,
      lastFetched: new Date(),
    },
    create: {
      type: targetType as any,
      identifier: normalizedInput,
      displayName: normalizedInput,
      signalData: signals as any,
      signalScore: signalScore.total,
      lastFetched: new Date(),
    },
  });

  const analysis = await saveCompletedAnalysis({
    userId,
    targetId: signalTarget.id,
    rawInput: normalizedInput,
    topIdeas,
    decision,
    creditCost: 1, // Default cost
    signalsRaw: signals,
  });

  // 6. Build Room Generation (if applicable)
  let buildRoomId: string | null = null;
  if (decision?.verdict === "BUILD") {
    const buildRoomContent = await generateBuildRoomContent({
      selectedIdea: decision.bestIdea,
      analysis: decision,
    });

    const buildRoom = await prisma.buildRoom.create({
      data: {
        selectedIdea: decision.bestIdea as any,
        productSpec: buildRoomContent.productSpec,
        architecture: buildRoomContent.architecture as any,
        prismaSchema: buildRoomContent.prismaSchema,
        apiMap: buildRoomContent.apiMap as any,
        stackRecs: buildRoomContent.stackRecs as any,
        agentTasks: buildRoomContent.agentTasks as any,
        founderTasks: buildRoomContent.founderTasks as any,
        landingCopy: buildRoomContent.landingCopy as any,
        launchPosts: buildRoomContent.launchPosts as any,
        prospectList: buildRoomContent.prospectList as any,
        financialModel: buildRoomContent.financialModel as any,
        businessModel: buildRoomContent.financialModel.revenueStreams?.[0] ?? "SaaS",
      },
    });

    buildRoomId = buildRoom.id;
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: { buildRoomId },
    });
  }

  return { analysis, decision, buildRoomId };
}
