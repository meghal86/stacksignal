import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Prisma } from "@prisma/client";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import type {
  AgentTask,
  ApiMapItem,
  BlueprintArchitecture,
  BusinessModel,
  FinancialModel,
  FounderTask,
  LaunchAssets,
  StackRecommendation,
} from "@/lib/build-room/types";

const BUSINESS_MODELS: BusinessModel[] = ["SaaS", "Agency", "API", "Template", "DataProduct"];

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function stripJsonFences(text: string) {
  return text.replace(/```json|```/g, "").trim();
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(stripJsonFences(text)) as T;
  } catch (error) {
    console.error("[generateBuildRoom] Failed to parse model JSON", error);
    return fallback;
  }
}

function getModel() {
  if (process.env.MOCK_LLM === "true" || !process.env.GEMINI_API_KEY) return null;

  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
}

async function generateJson<T>(prompt: string, fallback: T): Promise<T> {
  const model = getModel();
  if (!model) return fallback;

  const result = await model.generateContent(prompt);
  return parseJson(result.response.text(), fallback);
}

function ideaName(bestIdea: unknown) {
  if (bestIdea && typeof bestIdea === "object" && "name" in bestIdea) {
    const name = (bestIdea as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return "Selected opportunity";
}

function fallbackArchitecture(): BlueprintArchitecture {
  return {
    frontend: "Next.js App Router with server components for durable reporting and client components for interactions",
    backend: "Next.js route handlers with Prisma services",
    database: "Postgres through Prisma",
    jobs: "Inngest for async generation and follow-up workflows",
    email: "Resend for transactional waitlist and onboarding emails",
    payments: "Stripe Checkout for subscription billing",
    deployment: "Vercel with managed Postgres connection pooling",
  };
}

function fallbackApiMap(): ApiMapItem[] {
  return [
    { route: "/api/waitlist", method: "POST", purpose: "Capture qualified early access leads", auth: false },
    { route: "/api/projects", method: "GET", purpose: "List authenticated customer workspaces", auth: true },
    { route: "/api/projects", method: "POST", purpose: "Create the core customer object", auth: true },
  ];
}

function fallbackStackRecs(): StackRecommendation[] {
  return [
    {
      category: "Frontend",
      winner: "Next.js",
      whyForThisOpp: "Fast landing pages, authenticated dashboard, and API routes can ship from one codebase.",
      vsAlternative: "A separate SPA and API adds coordination cost before product-market fit.",
      affiliateUrl: "https://vercel.com",
    },
    {
      category: "Database",
      winner: "Supabase Postgres",
      whyForThisOpp: "Postgres handles relational customer data and early analytics without custom infrastructure.",
      vsAlternative: "A document database is faster to start but weaker for reporting and billing joins.",
      affiliateUrl: "https://supabase.com",
    },
    {
      category: "Jobs",
      winner: "Inngest",
      whyForThisOpp: "Background generation and retries are necessary without blocking the founder-facing UI.",
      vsAlternative: "Cron jobs are simpler but less reliable for multi-step generation.",
      affiliateUrl: "https://inngest.com",
    },
  ];
}

function fallbackTasks(name: string): { agentTasks: AgentTask[]; founderTasks: FounderTask[] } {
  const agentTasks = Array.from({ length: 8 }, (_, index) => ({
    id: `agent-${index + 1}`,
    title: [
      "Set up project scaffold",
      "Create Prisma schema",
      "Build authenticated dashboard",
      "Implement core API routes",
      "Add background job worker",
      "Create onboarding emails",
      "Build waitlist landing page",
      "Add smoke tests",
    ][index],
    description: `Draft the implementation step for ${name}.`,
    claudeCodePrompt: `Implement this ${name} build task: ${[
      "Set up project scaffold",
      "Create Prisma schema",
      "Build authenticated dashboard",
      "Implement core API routes",
      "Add background job worker",
      "Create onboarding emails",
      "Build waitlist landing page",
      "Add smoke tests",
    ][index]}. Preserve existing user changes and add tests where practical.`,
    estimatedMinutes: 45 + index * 10,
    dependsOn: index === 0 ? [] : [`agent-${index}`],
  }));

  const founderTasks = [
    "Pick first niche",
    "Interview five prospects",
    "Approve pricing",
    "Choose product name",
    "Decide first channel",
  ].map((title, index) => ({
    id: `founder-${index + 1}`,
    title,
    description: `Make the founder-level decision required before ${name} can be validated.`,
    whyHuman: "This depends on customer judgment, positioning, and appetite for risk.",
    estimatedMinutes: 30 + index * 15,
  }));

  return { agentTasks, founderTasks };
}

function fallbackLaunch(name: string): LaunchAssets {
  return {
    landingCopy: {
      headline: `${name} for busy teams`,
      subheadline: "Turn a painful manual workflow into a tracked, repeatable operating system.",
      heroCTA: "Join Waitlist",
      featureBlocks: [
        { title: "One focused workflow", description: "Keep the first version narrow enough to sell quickly." },
        { title: "Evidence-first reports", description: "Show customers the data behind every recommendation." },
        { title: "Fast handoff", description: "Give teams a practical next step instead of a generic dashboard." },
      ],
      pricingSection: {
        description: "Start with founder-led onboarding, then convert validated customers to recurring plans.",
        tiers: [
          { name: "Starter", price: "$99/mo", features: ["Core workflow", "Email support"] },
          { name: "Growth", price: "$299/mo", features: ["Team seats", "Priority onboarding"] },
        ],
      },
      socialProof: "Trusted by teams replacing spreadsheets and manual research.",
    },
    launchPosts: [
      {
        platform: "HackerNews",
        title: `Show HN: ${name}`,
        body: `I built a narrow MVP for ${name} after seeing repeated demand signals. The first version focuses on one workflow and avoids broad platform claims.`,
      },
      {
        platform: "Reddit",
        subreddit: "SaaS",
        title: `Looking for feedback on ${name}`,
        body: `I am validating ${name} with a small group of early users. The goal is to replace one painful manual workflow, not build a broad suite.`,
      },
      {
        platform: "IndieHackers",
        title: `Validating ${name}`,
        body: `I am taking a signal-first approach: one ICP, one workflow, one paid validation milestone.`,
      },
      {
        platform: "Twitter",
        thread: [
          `I am validating ${name}.`,
          "The first version is deliberately narrow.",
          "The goal is paid proof before feature breadth.",
          "I am talking to users before scaling distribution.",
          "Reply if this workflow is painful for your team.",
        ],
      },
      {
        platform: "LinkedIn",
        post: `I am validating ${name}, a focused product for teams dealing with a specific manual workflow. The first milestone is simple: prove urgency with real customer conversations before expanding scope.`,
      },
    ],
    waitlistOffer: {
      headline: `Get early access to ${name}`,
      incentive: "Early users get founder-led onboarding and influence the MVP scope.",
      ctaText: "Request Access",
    },
    firstProspects: {
      profileDescription: "Operators already solving this workflow manually with spreadsheets, scripts, or contractors.",
      whereToFind: ["Relevant GitHub issues", "Niche Slack groups", "Reddit threads", "LinkedIn operator posts"],
      outreachTemplate: `Hi {{name}}, I am validating ${name} for teams dealing with {{pain}}. Could I ask two quick questions about how you handle this today?`,
    },
  };
}

function fallbackFinancials(): FinancialModel {
  return {
    buildCostComponents: [
      { name: "Core product", estimatedHours: 120, description: "MVP workflow, dashboard, and persistence" },
      { name: "Launch assets", estimatedHours: 24, description: "Landing page, waitlist, and onboarding copy" },
      { name: "QA and deployment", estimatedHours: 32, description: "Smoke tests, monitoring, and production setup" },
    ],
    totalBuildHours: 176,
    monthlyFixedCosts: [
      { tool: "Vercel", cost: 20, tier: "Pro", required: true, affiliateUrl: "https://vercel.com" },
      { tool: "Supabase", cost: 25, tier: "Pro", required: true, affiliateUrl: "https://supabase.com" },
      { tool: "Resend", cost: 20, tier: "Starter", required: false, affiliateUrl: "https://resend.com" },
    ],
    totalMonthlyFixed: 65,
    variableCostPerCustomer: 3,
    variableCostExplanation: "Estimated API, email, and storage usage per active customer.",
    suggestedPricing: {
      starter: { price: 99, reasoning: "Low-friction paid validation." },
      growth: { price: 299, reasoning: "Best target for founder-led onboarding." },
      scale: { price: 799, reasoning: "Reserved for team workflows and integrations." },
    },
    breakEvenCustomers: 1,
    breakEvenMonth: 1,
    scenarios: {
      conservative: { assumption: "One customer every other week", month3MRR: 594, month6MRR: 1188, month12MRR: 2376 },
      realistic: { assumption: "Two customers per week after launch", month3MRR: 2392, month6MRR: 4784, month12MRR: 9568 },
      optimistic: { assumption: "Channel fit by month three", month3MRR: 5980, month6MRR: 14950, month12MRR: 29900 },
    },
  };
}

export const generateBuildRoom = inngest.createFunction(
  {
    id: "generate-build-room",
    name: "Generate Build Room Content",
    retries: 2,
    triggers: [{ event: "buildroom/generate.requested" }],
  },
  async ({ event, step }) => {
    const { analysisId, buildRoomId } = event.data as { analysisId: string; buildRoomId: string };

    const analysis = await step.run("fetch-analysis", async () => {
      return prisma.analysis.findUnique({
        where: { id: analysisId },
        include: {
          buildRoom: true,
          target: true,
          user: { include: { founderProfile: true } },
        },
      });
    });

    if (!analysis || analysis.verdict !== "BUILD") {
      throw new Error("Analysis not found or not a BUILD verdict");
    }

    const selectedName = ideaName(analysis.bestIdea);
    const context = {
      bestIdea: analysis.bestIdea,
      signals: analysis.target?.signalData ?? null,
      founderProfile: analysis.founderProfile ?? analysis.user?.founderProfile ?? null,
      verdictReasoning: analysis.verdictReasoning,
      scores: {
        demand: analysis.demandScore,
        founderFit: analysis.founderFitScore,
        crowdedness: analysis.crowdednessScore,
        wtp: analysis.wtpScore,
        gtmFit: analysis.gtmFitScore,
        buildComplexity: analysis.buildComplexity,
        speedToRevenue: analysis.speedToRevenue,
      },
    };

    const businessModel = await step.run("route-business-model", async () => {
      const prompt = `
Given this opportunity, determine the best business model.
Return ONLY JSON with this shape: {"businessModel":"SaaS"}.
Valid values: SaaS, Agency, API, Template, DataProduct.

Opportunity: ${JSON.stringify(context.bestIdea)}
Signal scores: ${JSON.stringify(context.scores)}
`;
      const result = await generateJson<{ businessModel: BusinessModel }>(prompt, { businessModel: "SaaS" });
      return BUSINESS_MODELS.includes(result.businessModel) ? result.businessModel : "SaaS";
    });

    const blueprintFallback = {
      productSpec: `${selectedName} is a focused product for teams with a validated workflow pain. It helps users capture the core input, process it reliably, and turn it into an action-ready output. The MVP should avoid broad automation and prove one paid workflow first.`,
      architecture: fallbackArchitecture(),
      prismaSchema: `model CustomerWorkspace {\n  id String @id @default(cuid())\n  name String\n  createdAt DateTime @default(now())\n}\n`,
      apiMap: fallbackApiMap(),
      stackRecommendations: fallbackStackRecs(),
      mvpBoundary: "IN: one ICP, one workflow, waitlist, billing, authenticated dashboard, and manual onboarding. OUT: broad integrations, mobile app, marketplace, and enterprise administration.",
    };

    const blueprint = await step
      .run("generate-blueprint", async () => {
        const prompt = `
You are a senior software architect and product strategist.
Return JSON only. No markdown.

OPPORTUNITY: ${JSON.stringify(context.bestIdea)}
BUSINESS MODEL: ${businessModel}
FOUNDER PROFILE: ${JSON.stringify(context.founderProfile)}

Required shape:
{
  "productSpec": "3-5 plain-English sentences",
  "architecture": {"frontend": "", "backend": "", "database": "", "jobs": "", "email": "", "payments": "", "deployment": ""},
  "prismaSchema": "complete Prisma schema extension for this product",
  "apiMap": [{"route": "", "method": "", "purpose": "", "auth": true}],
  "stackRecommendations": [{"category": "", "winner": "", "whyForThisOpp": "", "vsAlternative": "", "affiliateUrl": ""}],
  "mvpBoundary": "one paragraph with clear IN and OUT scope"
}
`;
        return generateJson(prompt, blueprintFallback);
      })
      .catch((error) => {
        console.error("[generateBuildRoom] Blueprint generation failed", error);
        return blueprintFallback;
      });

    await step.run("save-blueprint", async () => {
      await prisma.buildRoom.update({
        where: { id: buildRoomId },
        data: {
          businessModel,
          productSpec: blueprint.productSpec,
          architecture: toInputJson({ ...blueprint.architecture, mvpBoundary: blueprint.mvpBoundary }),
          prismaSchema: blueprint.prismaSchema,
          apiMap: toInputJson(blueprint.apiMap),
          stackRecs: toInputJson(blueprint.stackRecommendations),
        },
      });
    });

    const tasksFallback = fallbackTasks(selectedName);
    const tasks = await step
      .run("generate-build-tasks", async () => {
        const prompt = `
You are a senior engineering lead planning a solo founder project.
Return JSON only. No markdown.

PRODUCT SPEC: ${blueprint.productSpec}
ARCHITECTURE: ${JSON.stringify(blueprint.architecture)}
API MAP: ${JSON.stringify(blueprint.apiMap)}
FOUNDER PROFILE: ${JSON.stringify(context.founderProfile)}

Required shape:
{
  "agentTasks": [{"id": "", "title": "", "description": "", "claudeCodePrompt": "", "estimatedMinutes": 60, "dependsOn": []}],
  "founderTasks": [{"id": "", "title": "", "description": "", "whyHuman": "", "estimatedMinutes": 30}]
}

Generate 8-12 agent tasks and 5-8 founder tasks.
`;
        return generateJson(prompt, tasksFallback);
      })
      .catch((error) => {
        console.error("[generateBuildRoom] Task generation failed", error);
        return tasksFallback;
      });

    await step.run("save-tasks", async () => {
      await prisma.buildRoom.update({
        where: { id: buildRoomId },
        data: {
          agentTasks: toInputJson(tasks.agentTasks),
          founderTasks: toInputJson(tasks.founderTasks),
        },
      });
    });

    const launchFallback = fallbackLaunch(selectedName);
    const launch = await step
      .run("generate-launch-assets", async () => {
        const prompt = `
You are a developer marketing expert.
Return JSON only. No markdown.

PRODUCT: ${blueprint.productSpec}
ICP: ${JSON.stringify((context.bestIdea as { targetCustomer?: unknown } | null)?.targetCustomer ?? null)}
BUSINESS MODEL: ${businessModel}
VERDICT REASONING: ${context.verdictReasoning}

Required shape:
{
  "landingCopy": {"headline": "", "subheadline": "", "heroCTA": "", "featureBlocks": [{"title": "", "description": ""}], "pricingSection": {"description": "", "tiers": [{"name": "", "price": "", "features": []}]}, "socialProof": ""},
  "launchPosts": [{"platform": "HackerNews", "title": "", "body": ""}],
  "waitlistOffer": {"headline": "", "incentive": "", "ctaText": ""},
  "firstProspects": {"profileDescription": "", "whereToFind": [], "outreachTemplate": ""}
}
`;
        return generateJson<LaunchAssets>(prompt, launchFallback);
      })
      .catch((error) => {
        console.error("[generateBuildRoom] Launch generation failed", error);
        return launchFallback;
      });

    await step.run("save-launch", async () => {
      await prisma.buildRoom.update({
        where: { id: buildRoomId },
        data: {
          landingCopy: toInputJson(launch),
          launchPosts: toInputJson(launch.launchPosts ?? []),
          prospectList: toInputJson(launch.firstProspects?.whereToFind ?? []),
        },
      });
    });

    const financialFallback = fallbackFinancials();
    const financials = await step
      .run("generate-financial-model", async () => {
        const prompt = `
You are a SaaS financial analyst.
Return JSON only. No markdown.

OPPORTUNITY: ${JSON.stringify(context.bestIdea)}
ARCHITECTURE: ${JSON.stringify(blueprint.architecture)}
BUSINESS MODEL: ${businessModel}

Required shape:
{
  "buildCostComponents": [{"name": "", "estimatedHours": 10, "description": ""}],
  "totalBuildHours": 100,
  "monthlyFixedCosts": [{"tool": "", "cost": 20, "tier": "", "required": true, "affiliateUrl": ""}],
  "totalMonthlyFixed": 100,
  "variableCostPerCustomer": 3,
  "variableCostExplanation": "",
  "suggestedPricing": {"starter": {"price": 99, "reasoning": ""}, "growth": {"price": 299, "reasoning": ""}, "scale": {"price": 799, "reasoning": ""}},
  "breakEvenCustomers": 1,
  "breakEvenMonth": 1,
  "scenarios": {
    "conservative": {"assumption": "", "month3MRR": 0, "month6MRR": 0, "month12MRR": 0},
    "realistic": {"assumption": "", "month3MRR": 0, "month6MRR": 0, "month12MRR": 0},
    "optimistic": {"assumption": "", "month3MRR": 0, "month6MRR": 0, "month12MRR": 0}
  }
}
`;
        return generateJson<FinancialModel>(prompt, financialFallback);
      })
      .catch((error) => {
        console.error("[generateBuildRoom] Financial generation failed", error);
        return financialFallback;
      });

    await step.run("save-financials", async () => {
      await prisma.buildRoom.update({
        where: { id: buildRoomId },
        data: { financialModel: toInputJson(financials) },
      });
    });

    return { success: true, buildRoomId };
  }
);
