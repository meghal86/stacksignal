import type { Prisma, TargetType, Verdict } from "@prisma/client";
import prisma from "@/lib/prisma";

type CompletedDecision = {
  bestIdea?: unknown;
  verdict?: Verdict;
  confidence?: number;
  reasoning?: string;
  skipReasons?: unknown;
  validationPlan?: unknown;
  mvpScope?: unknown;
  scores?: {
    demand?: number;
    founderFit?: number;
    crowdedness?: number;
    wtp?: number;
    gtmFit?: number;
    buildComplexity?: number;
    speedToRevenue?: number;
    moat?: number;
    platformRisk?: number;
  };
};

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function parseInput(input: string, inputType: string): string {
  if (inputType === "github_repo") {
    const match = input.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (match) return match[1].replace(/\.git$/, '');
    return input.replace(/\.git$/, '');
  }
  return input;
}

export async function checkRateLimit(userId: string): Promise<boolean> {
  void userId;
  // Simple check for now
  return true;
}

export async function checkAnalysisCache(identifier: string, type: TargetType) {
  const target = await prisma.signalTarget.findUnique({
    where: { type_identifier: { type, identifier } },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { target: true },
      }
    }
  });

  if (target?.analyses[0]) {
    const analysis = target.analyses[0];
    const hoursSince = (Date.now() - analysis.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      return analysis;
    }
  }
  return null;
}

export async function createPendingAnalysis(
  userId: string, 
  input: string, 
  inputType: string, 
  tier: string
) {
  // We don't have a pending state for analysis strictly, but we can return basic details
  // Or create target if it doesn't exist
  return { userId, input, inputType, tier };
}

export async function getFounderProfile(userId: string) {
  return await prisma.founderProfile.findUnique({
    where: { userId }
  });
}

export async function deductCredits(userId: string, cost: number) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      creditsBalance: {
        decrement: cost,
      },
    },
  });
}

export async function saveCompletedAnalysis({
  userId,
  targetId,
  rawInput,
  topIdeas,
  decision,
  creditCost,
  signalsRaw,
}: {
  userId: string;
  targetId: string;
  rawInput: string;
  topIdeas: unknown[];
  decision?: CompletedDecision;
  creditCost: number;
  signalsRaw?: unknown;
}) {
  return await prisma.analysis.create({
    data: {
      user: userId ? { connect: { id: userId } } : undefined,
      target: targetId ? { connect: { id: targetId } } : undefined,
      rawInput,
      topIdeas: toInputJson(topIdeas),
      signalsRaw: toInputJson(signalsRaw),
      bestIdea: toInputJson(decision?.bestIdea),
      verdict: decision?.verdict,
      confidence: decision?.confidence,
      verdictReasoning: decision?.reasoning,
      skipReasons: toInputJson(decision?.skipReasons),
      validationPlan: toInputJson(decision?.validationPlan),
      mvpScope: toInputJson(decision?.mvpScope),
      demandScore: decision?.scores?.demand,
      founderFitScore: decision?.scores?.founderFit,
      crowdednessScore: decision?.scores?.crowdedness,
      wtpScore: decision?.scores?.wtp,
      gtmFitScore: decision?.scores?.gtmFit,
      buildComplexity: decision?.scores?.buildComplexity,
      speedToRevenue: decision?.scores?.speedToRevenue,
      moatScore: decision?.scores?.moat,
      platformRisk: decision?.scores?.platformRisk,
      creditsCost: creditCost,
      isPublic: true,
    }
  });
}
