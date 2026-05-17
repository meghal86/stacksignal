import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runEcosystemRefresh } from "@/lib/analysis/ecosystemRefresh";
import { createClient } from "@/lib/supabase-server";

async function getActingUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn("[signals/refresh] Supabase auth error", error.message);
  }

  if (user) return { id: user.id, email: user.email ?? "user@stacksignal.local" };
  if (process.env.NODE_ENV === "development") return { id: "test-user-id", email: "dev@stacksignal.local" };
  return null;
}

export async function POST() {
  try {
    const actingUser = await getActingUser();
    if (!actingUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.upsert({
      where: { id: actingUser.id },
      update: {},
      create: {
        id: actingUser.id,
        email: actingUser.email,
        creditsBalance: 100,
      },
    });

    const result = await runEcosystemRefresh(actingUser.id);

    return NextResponse.json({
      analysisId: result.analysis.id,
      slug: result.analysis.slug,
      repoCount: result.repos.length,
      repos: result.repos,
      signalScore: result.signalScore,
      ideasCount: result.ideas.length,
    });
  } catch (error) {
    console.error("[signals/refresh] Failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh signals" },
      { status: 500 }
    );
  }
}
