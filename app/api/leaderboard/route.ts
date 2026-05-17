import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  let cache = await prisma.leaderboardCache.findUnique({
    where: { date: today },
  });

  if (!cache) {
    cache = await prisma.leaderboardCache.findFirst({
      orderBy: { date: "desc" },
    });
  }

  if (!cache) {
    const analyses = await prisma.analysis.findMany({
      where: {
        isPublic: true,
        verdict: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        slug: true,
        rawInput: true,
        verdict: true,
        confidence: true,
        bestIdea: true,
        demandScore: true,
        crowdednessScore: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      source: "analyses",
      date: today,
      entries: analyses,
    });
  }

  return NextResponse.json({
    source: "cache",
    date: cache.date,
    entries: cache.entries,
  });
}
