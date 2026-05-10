import { inngest } from "../client";
import { runFullAnalysis } from "@/lib/analysis/engine";
import { detectAnalysisInputType, normalizeAnalysisInput } from "@/lib/analysis/input";
import prisma from "@/lib/prisma";

/**
 * Curated list of trending repos/packages to analyze daily.
 * This list should be updated weekly based on GitHub Trending,
 * HN front page, and Twitter/X tech discourse.
 * 
 * Format: { input: string, reason: string }
 */
const DAILY_TARGETS = [
  // AI / LLM Infrastructure
  { input: "https://github.com/langchain-ai/langchain", reason: "LLM orchestration leader" },
  { input: "https://github.com/run-llama/llama_index", reason: "RAG framework" },
  { input: "https://github.com/openai/openai-python", reason: "OpenAI SDK ecosystem" },
  { input: "https://github.com/anthropics/anthropic-sdk-python", reason: "Claude SDK" },
  { input: "https://github.com/vercel/ai", reason: "AI SDK for React" },
  
  // Developer Tools
  { input: "https://github.com/drizzle-team/drizzle-orm", reason: "Rising ORM" },
  { input: "https://github.com/biomejs/biome", reason: "Fast JS toolchain" },
  { input: "https://github.com/astral-sh/uv", reason: "Fast Python package manager" },
  { input: "https://github.com/oven-sh/bun", reason: "JS runtime challenger" },
  { input: "https://github.com/denoland/deno", reason: "Deno runtime" },
  
  // Infrastructure
  { input: "https://github.com/supabase/supabase", reason: "Firebase alternative" },
  { input: "https://github.com/pocketbase/pocketbase", reason: "Lightweight BaaS" },
  { input: "https://github.com/neon-tech/neon", reason: "Serverless Postgres" },
  { input: "https://github.com/turso-tech/libsql", reason: "Edge SQLite" },
  
  // Frontend
  { input: "https://github.com/shadcn-ui/ui", reason: "Component library leader" },
  { input: "https://github.com/tailwindlabs/tailwindcss", reason: "CSS utility framework" },
  { input: "https://github.com/vitejs/vite", reason: "Build tool" },
  { input: "https://github.com/sveltejs/svelte", reason: "Compiler framework" },
  
  // Observability / DevOps
  { input: "https://github.com/grafana/grafana", reason: "Monitoring platform" },
  { input: "https://github.com/PostHog/posthog", reason: "Product analytics" },
  
  // Emerging
  { input: "https://github.com/modelcontextprotocol/servers", reason: "MCP protocol" },
  { input: "https://github.com/continuedev/continue", reason: "AI code assistant" },
  { input: "https://github.com/comfyanonymous/ComfyUI", reason: "Image gen workflow" },
  { input: "https://github.com/jina-ai/reader", reason: "Web-to-LLM reader" },
  { input: "https://github.com/lobehub/lobe-chat", reason: "Open source ChatGPT" },
];

// System user ID for automated analyses
const SYSTEM_USER_ID = "system-daily-signal";

/**
 * Daily Signal Cron — Runs at 6:00 AM UTC daily
 * Analyzes a batch of trending repos/packages and stores results
 * for the public leaderboard and homepage.
 */
export const dailySignalCron = inngest.createFunction(
  {
    id: "daily-signal-cron",
    triggers: [{ cron: "0 6 * * *" }], // Every day at 6 AM UTC
  },
  async ({ step }) => {
    // Ensure system user exists
    await step.run("ensure-system-user", async () => {
      const existing = await prisma.user.findUnique({
        where: { id: SYSTEM_USER_ID },
      });
      if (!existing) {
        await prisma.user.create({
          data: {
            id: SYSTEM_USER_ID,
            email: "system@stacksignal.internal",
            creditsBalance: 999999,
            plan: "PRO" as any,
          },
        });
      }
    });

    // Pick 5 random targets from the list to avoid API rate limits
    const shuffled = [...DAILY_TARGETS].sort(() => Math.random() - 0.5);
    const batch = shuffled.slice(0, 5);

    const results: Array<{
      input: string;
      verdict: string | null;
      score: number;
      error?: string;
    }> = [];

    for (const target of batch) {
      const result = await step.run(`analyze-${target.input.split("/").pop()}`, async () => {
        try {
          const inputType = detectAnalysisInputType(target.input);
          const normalizedInput = normalizeAnalysisInput(target.input, inputType);

          // Check if we already analyzed this in the last 24h
          const recentAnalysis = await prisma.analysis.findFirst({
            where: {
              rawInput: normalizedInput,
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          });

          if (recentAnalysis) {
            return {
              input: normalizedInput,
              verdict: recentAnalysis.verdict,
              score: recentAnalysis.demandScore ?? 0,
              skipped: true,
            };
          }

          const { analysis, decision } = await runFullAnalysis({
            userId: SYSTEM_USER_ID,
            normalizedInput,
            inputType,
          });

          return {
            input: normalizedInput,
            verdict: decision?.verdict ?? null,
            score: decision?.scores?.composite ?? 0,
          };
        } catch (error) {
          console.error(`[daily-cron] Failed to analyze ${target.input}:`, error);
          return {
            input: target.input,
            verdict: null,
            score: 0,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      results.push(result);
    }

    // Log summary
    const summary = {
      date: new Date().toISOString().split("T")[0],
      totalAnalyzed: results.length,
      builds: results.filter((r) => r.verdict === "BUILD").length,
      skips: results.filter((r) => r.verdict === "SKIP").length,
      watches: results.filter((r) => r.verdict === "WATCH").length,
      errors: results.filter((r) => r.error).length,
    };

    console.log("[daily-cron] Summary:", JSON.stringify(summary, null, 2));

    return { summary, results };
  }
);

/**
 * On-demand batch analysis — triggered by admin
 */
export const batchAnalysis = inngest.createFunction(
  {
    id: "batch-analysis",
    triggers: [{ event: "app/analyze.batch" }],
  },
  async ({ event, step }) => {
    const targets = event.data.targets as string[];
    const results = [];

    for (const target of targets.slice(0, 10)) {
      const result = await step.run(`analyze-${target}`, async () => {
        try {
          const inputType = detectAnalysisInputType(target);
          const normalizedInput = normalizeAnalysisInput(target, inputType);

          const { analysis, decision } = await runFullAnalysis({
            userId: SYSTEM_USER_ID,
            normalizedInput,
            inputType,
          });

          return {
            input: normalizedInput,
            verdict: decision?.verdict ?? null,
            slug: analysis.slug,
          };
        } catch (error) {
          return {
            input: target,
            verdict: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      results.push(result);
    }

    return { results };
  }
);
