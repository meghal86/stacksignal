import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { background, industries, timeline, userId } = body;

    // Validate inputs
    if (!background?.length || !industries?.length || !timeline) {
      return NextResponse.json(
        { error: "All three profile fields are required" },
        { status: 400 }
      );
    }

    // For now, use userId from body or a default demo user
    // In production, this would come from the auth session
    const effectiveUserId = userId || "demo-user";

    // Upsert: create or update the founder profile
    const profile = await prisma.founderProfile.upsert({
      where: { userId: effectiveUserId },
      update: {
        background,
        industries,
        timeline,
      },
      create: {
        userId: effectiveUserId,
        background,
        industries,
        timeline,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        background: profile.background,
        industries: profile.industries,
        timeline: profile.timeline,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save profile";
    console.error("[founder-profile] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId =
      req.nextUrl.searchParams.get("userId") || "demo-user";

    const profile = await prisma.founderProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        background: profile.background,
        industries: profile.industries,
        timeline: profile.timeline,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch profile";
    console.error("[founder-profile] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
