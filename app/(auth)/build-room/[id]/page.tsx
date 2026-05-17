import { notFound, redirect } from "next/navigation";
import { BuildRoom } from "@/components/build-room/BuildRoom";
import type { BuildRoomContent, BuildRoomStatusResponse, BuildRoomTabs } from "@/lib/build-room/types";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{ id: string }>;
};

function tabsForBuildRoom(buildRoom: NonNullable<Awaited<ReturnType<typeof loadByAnalysisId>>>["buildRoom"]): BuildRoomTabs {
  const blueprint = buildRoom?.productSpec ? "ready" : "generating";
  const buildTasks = buildRoom?.agentTasks ? "ready" : "generating";
  const financials = buildRoom?.financialModel ? "ready" : "generating";
  const launch = buildRoom?.blueprintApproved ? (buildRoom.landingCopy ? "ready" : "generating") : buildRoom?.productSpec ? "awaiting_approval" : "locked";

  return { blueprint, buildTasks, launch, financials };
}

function statusForTabs(tabs: BuildRoomTabs): BuildRoomStatusResponse["status"] {
  return Object.values(tabs).some((status) => status === "generating") ? "generating" : "ready";
}

async function loadByAnalysisId(id: string) {
  return prisma.analysis.findUnique({
    where: { id },
    include: {
      buildRoom: true,
      target: true,
    },
  });
}

async function loadByBuildRoomId(id: string) {
  return prisma.buildRoom.findUnique({
    where: { id },
    include: {
      analysis: {
        include: {
          target: true,
          buildRoom: true,
        },
      },
    },
  });
}

function serializeContent(analysis: NonNullable<Awaited<ReturnType<typeof loadByAnalysisId>>>): BuildRoomContent | null {
  if (!analysis.buildRoom) return null;
  return {
    id: analysis.buildRoom.id,
    analysisId: analysis.id,
    selectedIdea: analysis.buildRoom.selectedIdea as BuildRoomContent["selectedIdea"],
    businessModel: analysis.buildRoom.businessModel,
    productSpec: analysis.buildRoom.productSpec,
    architecture: analysis.buildRoom.architecture as BuildRoomContent["architecture"],
    prismaSchema: analysis.buildRoom.prismaSchema,
    apiMap: analysis.buildRoom.apiMap as BuildRoomContent["apiMap"],
    stackRecs: analysis.buildRoom.stackRecs as BuildRoomContent["stackRecs"],
    agentTasks: analysis.buildRoom.agentTasks as BuildRoomContent["agentTasks"],
    founderTasks: analysis.buildRoom.founderTasks as BuildRoomContent["founderTasks"],
    landingCopy: analysis.buildRoom.landingCopy as BuildRoomContent["landingCopy"],
    launchPosts: analysis.buildRoom.launchPosts as BuildRoomContent["launchPosts"],
    prospectList: analysis.buildRoom.prospectList as BuildRoomContent["prospectList"],
    financialModel: analysis.buildRoom.financialModel as BuildRoomContent["financialModel"],
    blueprintApproved: analysis.buildRoom.blueprintApproved,
    launchApproved: analysis.buildRoom.launchApproved,
    createdAt: analysis.buildRoom.createdAt.toISOString(),
    updatedAt: analysis.buildRoom.updatedAt.toISOString(),
    analysis: {
      id: analysis.id,
      rawInput: analysis.rawInput,
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      verdictReasoning: analysis.verdictReasoning,
      skipReasons: analysis.skipReasons,
      demandScore: analysis.demandScore,
      founderFitScore: analysis.founderFitScore,
      crowdednessScore: analysis.crowdednessScore,
      wtpScore: analysis.wtpScore,
      gtmFitScore: analysis.gtmFitScore,
      buildComplexity: analysis.buildComplexity,
      speedToRevenue: analysis.speedToRevenue,
      moatScore: analysis.moatScore,
      platformRisk: analysis.platformRisk,
      founderProfile: analysis.founderProfile,
      topIdeas: analysis.topIdeas,
    },
  };
}

export default async function BuildRoomPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let analysis = await loadByAnalysisId(id);

  if (!analysis) {
    const buildRoom = await loadByBuildRoomId(id);
    analysis = buildRoom?.analysis ?? null;
  }

  const canView =
    analysis?.userId === user.id ||
    (analysis?.isPublic && analysis.userId === "system-daily-signal");

  if (!analysis || !canView || analysis.verdict !== "BUILD") {
    notFound();
  }

  const tabs = analysis.buildRoom ? tabsForBuildRoom(analysis.buildRoom) : undefined;
  const initialData: BuildRoomStatusResponse = analysis.buildRoom
    ? {
        status: statusForTabs(tabs!),
        buildRoomId: analysis.buildRoom.id,
        tabs,
        content: serializeContent(analysis) ?? undefined,
        blueprintApproved: analysis.buildRoom.blueprintApproved,
        launchApproved: analysis.buildRoom.launchApproved,
      }
    : { status: "not_started" };

  return <BuildRoom analysisId={analysis.id} initialData={initialData} />;
}
