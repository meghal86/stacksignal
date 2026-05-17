import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import type { BuildRoomContent, BuildRoomStatusResponse, BuildRoomTabs } from "@/lib/build-room/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getActingUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) return user.id;
  if (process.env.NODE_ENV === "development") return "test-user-id";
  return null;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

async function loadAnalysis(analysisId: string) {
  return prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      buildRoom: true,
      target: true,
    },
  });
}

function resolveTabs(buildRoom: NonNullable<Awaited<ReturnType<typeof loadAnalysis>>>["buildRoom"]): BuildRoomTabs {
  const blueprint = buildRoom?.productSpec ? "ready" : "generating";
  const buildTasks = buildRoom?.agentTasks ? "ready" : "generating";
  const financials = buildRoom?.financialModel ? "ready" : "generating";

  let launch: BuildRoomTabs["launch"] = "locked";
  if (buildRoom?.blueprintApproved) {
    launch = buildRoom.landingCopy ? "ready" : "generating";
  } else if (buildRoom?.landingCopy || buildRoom?.productSpec) {
    launch = "awaiting_approval";
  }

  return { blueprint, buildTasks, launch, financials };
}

function resolveStatus(tabs: BuildRoomTabs): BuildRoomStatusResponse["status"] {
  return Object.values(tabs).some((status) => status === "generating") ? "generating" : "ready";
}

async function assertAuthorized(analysisId: string) {
  const actingUserId = await getActingUserId();
  const analysis = await loadAnalysis(analysisId);

  if (!analysis) {
    return { error: NextResponse.json({ error: "Analysis not found" }, { status: 404 }), analysis: null };
  }

  if (!actingUserId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), analysis: null };
  }

  const canAccess =
    !analysis.userId ||
    analysis.userId === actingUserId ||
    (analysis.isPublic && analysis.userId === "system-daily-signal");

  if (!canAccess) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), analysis: null };
  }

  return { error: null, analysis };
}

export async function POST(_req: Request, { params }: RouteContext) {
  const { id: analysisId } = await params;
  const { error, analysis } = await assertAuthorized(analysisId);
  if (error) return error;

  if (analysis.verdict !== "BUILD") {
    return NextResponse.json({ error: "Build Room only available for BUILD verdicts" }, { status: 400 });
  }

  let buildRoom = analysis.buildRoom;

  if (!buildRoom) {
    buildRoom = await prisma.buildRoom.create({
      data: {
        selectedIdea: toInputJson(analysis.bestIdea),
      },
    });

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { buildRoomId: buildRoom.id },
    });
  }

  await inngest.send({
    name: "buildroom/generate.requested",
    data: { analysisId, buildRoomId: buildRoom.id },
  });

  return NextResponse.json({
    buildRoomId: buildRoom.id,
    message: "Build Room generation started",
  });
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: analysisId } = await params;
  const { error, analysis } = await assertAuthorized(analysisId);
  if (error) return error;

  if (!analysis.buildRoom) {
    return NextResponse.json({ status: "not_started" } satisfies BuildRoomStatusResponse);
  }

  const tabs = resolveTabs(analysis.buildRoom);

  return NextResponse.json({
    status: resolveStatus(tabs),
    buildRoomId: analysis.buildRoom.id,
    tabs,
    blueprintApproved: analysis.buildRoom.blueprintApproved,
    launchApproved: analysis.buildRoom.launchApproved,
    content: {
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
      createdAt: analysis.buildRoom.createdAt,
      updatedAt: analysis.buildRoom.updatedAt,
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
    },
  } satisfies BuildRoomStatusResponse);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id: analysisId } = await params;
  const { error, analysis } = await assertAuthorized(analysisId);
  if (error) return error;

  if (!analysis.buildRoom) {
    return NextResponse.json({ error: "Build Room not found" }, { status: 404 });
  }

  const body = (await req.json()) as { gate?: unknown };
  if (body.gate !== "blueprint" && body.gate !== "launch") {
    return NextResponse.json({ error: "Invalid approval gate" }, { status: 400 });
  }

  const updateData =
    body.gate === "blueprint"
      ? { blueprintApproved: true, blueprintApprovedAt: new Date() }
      : { launchApproved: true, launchApprovedAt: new Date() };

  await prisma.buildRoom.update({
    where: { id: analysis.buildRoom.id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
