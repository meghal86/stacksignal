import { GoogleGenerativeAI } from "@google/generative-ai";


export interface BuildRoomContent {
  productSpec: string;
  architecture: any;
  prismaSchema: string;
  apiMap: any[];
  stackRecs: Array<{ category: string; tool: string }>;
  agentTasks: Array<{ title: string; description: string }>;
  founderTasks: Array<{ title: string; description: string }>;
  landingCopy: {
    heroTitle: string;
    heroSubtitle: string;
    features: string[];
    cta: string;
  };
  launchPosts: Array<{ platform: string; content: string }>;
  prospectList: string[];
  financialModel: {
    burn: number;
    targetMrr: number;
    breakevenMonths: number;
    revenueStreams: string[];
    projections: number[]; // 6 months of revenue projections
  };
}

export async function generateBuildRoomContent(input: {
  selectedIdea: any;
  analysis: any;
}): Promise<BuildRoomContent> {
  if (process.env.MOCK_LLM === "true") {
    console.log("[buildRoomEngine] Using MOCK_LLM mode");
    return {
      productSpec: "This is a mocked product specification for " + input.selectedIdea.name + ". It outlines the core value proposition and technical approach.",
      architecture: {
        frontend: "Next.js 16 with Turbopack",
        backend: "Supabase and Prisma",
        jobs: "Inngest",
        styling: "Vanilla CSS with Design Tokens"
      },
      prismaSchema: "model Product {\n  id String @id @default(cuid())\n  name String\n  createdAt DateTime @default(now())\n}",
      apiMap: [
        { path: "/api/health", method: "GET", description: "Health check endpoint" }
      ],
      stackRecs: [
        { category: "Database", tool: "Supabase" },
        { category: "Auth", tool: "Supabase Auth" },
        { category: "Frontend", tool: "Next.js" },
        { category: "Jobs", tool: "Inngest" },
        { category: "Email", tool: "Resend" }
      ],
      agentTasks: [
        { title: "Initialize Repo", description: "Set up the Next.js project with the recommended stack." },
        { title: "Generate Schema", description: "Apply the Prisma schema and sync with Supabase." }
      ],
      founderTasks: [
        { title: "Customer Interviews", description: "Talk to 5 potential customers to validate the specific pain points." },
        { title: "Landing Page Launch", description: "Deploy the hero section and start collecting emails." }
      ],
      landingCopy: {
        heroTitle: "Build " + input.selectedIdea.name + " Faster",
        heroSubtitle: "The enterprise-ready starter for high-growth teams.",
        features: ["Scale in minutes", "Security first", "Developer loved"],
        cta: "Start Building"
      },
      launchPosts: [
        { platform: "X.com", content: "Just launched the blueprint for " + input.selectedIdea.name + " on StackSignal!" }
      ],
      prospectList: ["https://github.com/nutlope", "https://github.com/steven-tey"],
      financialModel: {
        burn: 200,
        targetMrr: 5000,
        breakevenMonths: 3,
        revenueStreams: ["Subscription", "Enterprise License"],
        projections: [0, 500, 1500, 3000, 5000, 8000]
      }
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
You are a senior product architect and founder's advisor. 
You are designing a startup called "${input.selectedIdea.name}" based on the following analysis:
${JSON.stringify(input.analysis, null, 2)}

YOUR TASK: Generate a complete technical and business blueprint for this MVP.

1. PRODUCT SPEC: 3-5 paragraphs of clear, executable product definition.
2. ARCHITECTURE: Key technical decisions.
3. PRISMA SCHEMA: A working schema.prisma that covers the core entities.
4. STACK RECS: 5 specific tools (Database, Auth, Frontend, Jobs, Email) optimized for speed to revenue.
5. AGENT TASKS: 5 tasks an AI agent can do (coding, scraping, research).
6. FOUNDER TASKS: 5 tasks the human founder MUST do (sales, networking, niche verification).
7. LANDING COPY: Hero title, subtitle, 3 features, 1 CTA.
8. LAUNCH POSTS: One for X.com, one for LinkedIn, one for HN.
9. FINANCIALS: Estimated monthly burn (hosting + tools), target MRR for MVP, break-even timeline in months, 3 revenue streams, and 6 months of revenue projections (array of numbers).

Return JSON only. No markdown. No preamble.
JSON keys: productSpec, architecture, prismaSchema, apiMap, stackRecs, agentTasks, founderTasks, landingCopy, launchPosts, prospectList, financialModel.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as BuildRoomContent;
}
