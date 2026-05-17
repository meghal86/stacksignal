import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Prisma } from "@prisma/client";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { normalizeAnalysisInput } from "@/lib/analysis/input";
import { runFullAnalysis } from "@/lib/analysis/engine";
import { fetchTrendingRepos, type TrendingRepo } from "@/lib/signals/trending";

const SYSTEM_USER_ID = "system-daily-signal";
const ANALYSIS_LIMIT = Number(process.env.DAILY_SIGNAL_SCAN_LIMIT ?? 5);

type DailyLeaderboardEntry = {
  repoName: string;
  analysisId: string;
  slug: string;
  verdict: string | null;
  signalScore: number;
  topIdea?: string;
  stars: number;
  language: string;
  url: string;
};

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

async function ensureSystemUser() {
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    update: {},
    create: {
      id: SYSTEM_USER_ID,
      email: "system@stacksignal.internal",
      creditsBalance: 999999,
      plan: "PRO",
    },
  });
}

function getTopIdeaName(topIdeas: unknown) {
  if (!Array.isArray(topIdeas)) return undefined;
  const first = topIdeas[0] as { name?: unknown; title?: unknown } | undefined;
  return typeof first?.name === "string" ? first.name : typeof first?.title === "string" ? first.title : undefined;
}

async function generateDailyTweet(analysis: DailyLeaderboardEntry): Promise<string[]> {
  if (process.env.MOCK_LLM === "true" || !process.env.GEMINI_API_KEY) {
    return [
      `${analysis.repoName} is trending with ${analysis.stars.toLocaleString()} stars.`,
      `Signal verdict: ${analysis.verdict ?? "WATCH"} with score ${analysis.signalScore.toFixed(1)}.`,
      `Top opportunity: ${analysis.topIdea ?? "Review the full analysis"}.`,
      `Why now: developer attention is concentrated around this stack.`,
      `Full report: /report/${analysis.slug}`,
    ];
  }

  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
Generate a 5-tweet thread about this business opportunity.
Return JSON array of 5 strings. Each string max 280 chars.
No hype. Cite specific numbers. Technical audience.

Opportunity: ${JSON.stringify(analysis)}

Tweet 1: The signal data hook (numbers only)
Tweet 2: The specific gap found
Tweet 3: Why it matters now
Tweet 4: What a founder could build
Tweet 5: Link to full analysis + CTA

Return JSON array only.
`;
  const result = await model.generateContent(prompt);
  const clean = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as string[];
}

async function analyzeTrendingRepo(repo: TrendingRepo): Promise<DailyLeaderboardEntry | null> {
  try {
    const normalizedInput = normalizeAnalysisInput(repo.fullName, "github_repo");
    const { analysis, decision } = await runFullAnalysis({
      userId: SYSTEM_USER_ID,
      normalizedInput,
      inputType: "github_repo",
    });

    const updated = await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        rawInput: repo.url,
        isPublic: true,
        creditsCost: 0,
      },
      include: { target: true },
    });

    const signalScore = updated.target?.signalScore ?? decision?.signalScoreTotal ?? 0;

    return {
      repoName: repo.fullName,
      analysisId: updated.id,
      slug: updated.slug,
      verdict: updated.verdict,
      signalScore,
      topIdea: getTopIdeaName(updated.topIdeas),
      stars: repo.stars,
      language: repo.language,
      url: repo.url,
    };
  } catch (error) {
    console.error(`[daily-signal-scan] Failed to analyze ${repo.fullName}:`, error);
    return null;
  }
}

export async function runDailySignalScan() {
  await ensureSystemUser();

  const trending = await fetchTrendingRepos();
  console.log(`[daily-signal-scan] Found ${trending.length} trending repos to analyze`);

  const toAnalyze = trending.slice(0, ANALYSIS_LIMIT);
  const results: DailyLeaderboardEntry[] = [];

  for (const repo of toAnalyze) {
    const entry = await analyzeTrendingRepo(repo);
    if (entry) results.push(entry);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const today = new Date().toISOString().split("T")[0];
  await prisma.leaderboardCache.upsert({
    where: { date: today },
    create: {
      date: today,
      entries: toInputJson(results),
    },
    update: {
      entries: toInputJson(results),
    },
  });

  const best = results
    .filter((entry) => entry.verdict === "BUILD")
    .sort((a, b) => b.signalScore - a.signalScore)[0];

  if (best) {
    const tweetThread = await generateDailyTweet(best);
    await prisma.contentDraft.create({
      data: {
        type: "twitter_thread",
        content: toInputJson(tweetThread),
        analysisId: best.analysisId,
        status: "pending_review",
      },
    });
  }

  return { analyzed: results.length, trendingFound: trending.length, results };
}

export const dailySignalScan = inngest.createFunction(
  {
    id: "daily-signal-scan",
    name: "Daily Trending Repo Signal Scan",
    retries: 1,
    concurrency: { limit: 3 },
    triggers: [{ cron: "0 6 * * *" }, { event: "leaderboard/refresh.requested" }],
  },
  async ({ step }) => {
    const result = await step.run("run-daily-signal-scan", async () => runDailySignalScan());
    return result;
  }
);
