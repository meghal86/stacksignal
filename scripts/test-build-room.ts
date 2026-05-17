import prisma from "../lib/prisma";

const baseUrl = process.env.STACKSIGNAL_URL ?? "http://localhost:3000";

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as unknown;
  return { response, body };
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

async function main() {
  const buildAnalysis =
    process.argv[2] ??
    (
      await prisma.analysis.findFirst({
        where: { verdict: "BUILD" },
        orderBy: { createdAt: "desc" },
      })
    )?.id;

  if (!buildAnalysis) {
    throw new Error("No BUILD verdict analysis found. Run an analysis that returns BUILD first.");
  }

  console.log(`Testing Build Room for analysis ${buildAnalysis}`);

  const trigger = await request(`/api/analyze/${buildAnalysis}/build-room`, { method: "POST" });
  assert(trigger.response.status === 200, "POST returns 200 with buildRoomId");
  const triggerBody = trigger.body as { buildRoomId?: string };
  assert(Boolean(triggerBody.buildRoomId), "BuildRoom record created or reused");

  await new Promise((resolve) => setTimeout(resolve, Number(process.env.BUILD_ROOM_TEST_WAIT_MS ?? 30000)));

  const status = await request(`/api/analyze/${buildAnalysis}/build-room`);
  assert(status.response.status === 200, "GET returns 200");
  const statusBody = status.body as {
    status?: string;
    tabs?: { blueprint?: string; buildTasks?: string };
    content?: {
      productSpec?: string;
      agentTasks?: Array<{ claudeCodePrompt?: string }>;
      financialModel?: {
        scenarios?: { realistic?: { month12MRR?: number } };
        suggestedPricing?: { starter?: { price?: number } };
        totalBuildHours?: number;
      };
    };
  };
  assert(statusBody.status === "ready" || statusBody.status === "generating", "status is ready or generating");
  assert(statusBody.tabs?.blueprint === "ready", "blueprint tab is ready");
  assert(statusBody.tabs?.buildTasks === "ready", "buildTasks tab is ready");
  assert(Boolean(statusBody.content?.productSpec), "productSpec is non-empty");
  assert((statusBody.content?.agentTasks?.length ?? 0) >= 8, "agentTasks has 8+ items");
  assert(Boolean(statusBody.content?.agentTasks?.every((task) => task.claudeCodePrompt)), "each agentTask has claudeCodePrompt");

  const approval = await request(`/api/analyze/${buildAnalysis}/build-room`, {
    method: "PATCH",
    body: JSON.stringify({ gate: "blueprint" }),
  });
  assert(approval.response.status === 200, "PATCH blueprint approval returns success");

  const approved = await prisma.analysis.findUnique({
    where: { id: buildAnalysis },
    include: { buildRoom: true },
  });
  assert(approved?.buildRoom?.blueprintApproved === true, "blueprintApproved is true in DB");

  const financialModel = statusBody.content?.financialModel;
  assert((financialModel?.scenarios?.realistic?.month12MRR ?? 0) > 0, "realistic month12MRR is positive");
  assert((financialModel?.suggestedPricing?.starter?.price ?? 0) > 0, "starter price is positive");
  assert((financialModel?.totalBuildHours ?? 0) > 0, "totalBuildHours is positive");

  const skipAnalysis = await prisma.analysis.findFirst({
    where: { verdict: "SKIP" },
    orderBy: { createdAt: "desc" },
  });

  if (skipAnalysis) {
    const skip = await request(`/api/analyze/${skipAnalysis.id}/build-room`, { method: "POST" });
    assert(skip.response.status === 400, "SKIP verdict returns 400");
  } else {
    console.log("No SKIP verdict analysis found; skipped verdict guard test.");
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
