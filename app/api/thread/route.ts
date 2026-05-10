import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateThread, formatThreadForCopy, generateSingleTweet } from "@/lib/content/twitterThread";

/**
 * GET /api/thread?slug=xxx&format=copy|json|single
 * 
 * Generates a Twitter/X thread from an analysis.
 * Used for content distribution from the daily cron pipeline.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const format = url.searchParams.get("format") || "json";

  if (!slug) {
    return NextResponse.json({ error: "slug parameter is required" }, { status: 400 });
  }

  const analysis = await prisma.analysis.findUnique({
    where: { slug },
    include: { target: true },
  });

  if (!analysis || !analysis.verdict) {
    return NextResponse.json({ error: "Analysis not found or has no verdict" }, { status: 404 });
  }

  const threadInput = {
    targetName: analysis.target?.displayName || analysis.rawInput,
    verdict: analysis.verdict as "BUILD" | "SKIP" | "WATCH",
    confidence: analysis.confidence ?? 0,
    reasoning: analysis.verdictReasoning || "Analysis complete.",
    scores: {
      demand: analysis.demandScore ?? undefined,
      crowdedness: analysis.crowdednessScore ?? undefined,
      wtp: analysis.wtpScore ?? undefined,
      moat: analysis.moatScore ?? undefined,
      platformRisk: analysis.platformRisk ?? undefined,
    },
    skipReasons: (analysis.skipReasons as any[]) ?? [],
    bestIdea: analysis.bestIdea as any,
    reportUrl: `https://stacksignal.com/report/${slug}`,
  };

  if (format === "single") {
    const tweet = generateSingleTweet(threadInput);
    return new Response(tweet, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const thread = generateThread(threadInput);

  if (format === "copy") {
    const formatted = formatThreadForCopy(thread);
    return new Response(formatted, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({
    thread,
    tweetCount: thread.length,
    totalChars: thread.reduce((sum, t) => sum + t.length, 0),
  });
}
