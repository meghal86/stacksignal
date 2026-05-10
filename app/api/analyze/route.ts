import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { detectAnalysisInputType, normalizeAnalysisInput, type AnalysisInputType } from "@/lib/analysis/input";
import { runFullAnalysis } from "@/lib/analysis/engine";
import { checkAnalysisCache, deductCredits } from "@/lib/api/analyze-helpers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const body = await req.json();
    const rawInput = typeof body.input === "string" ? body.input.trim() : "";
    const tier = body.tier === "paid" ? "paid" : "free";
    const inputType = (body.inputType as AnalysisInputType | undefined) ?? detectAnalysisInputType(rawInput);

    if (!rawInput) return NextResponse.json({ error: "input is required" }, { status: 400 });

    const normalizedInput = normalizeAnalysisInput(rawInput, inputType);
    const targetType = inputType === "github_repo" ? "GITHUB_REPO" : inputType === "npm_package" ? "NPM_PACKAGE" : "PYPI_PACKAGE";

    const actingUser = authUser ?? (process.env.NODE_ENV === "development" ? { id: "test-user-id", email: "dev@stacksignal.local" } : null);
    if (!actingUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let dbUser = await prisma.user.findUnique({ where: { id: actingUser.id } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { id: actingUser.id, email: actingUser.email ?? "dev@stacksignal.local", creditsBalance: 100 },
      });
    }

    const creditCost = tier === "paid" ? 5 : 1;
    if (dbUser.creditsBalance < creditCost) return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });

    const cachedAnalysis = await checkAnalysisCache(normalizedInput, targetType);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
        };

        try {
          if (cachedAnalysis && cachedAnalysis.verdict) {
            sendEvent("ideas_ready", { ideas: cachedAnalysis.topIdeas, signalScore: { total: (cachedAnalysis as any).target?.signalScore ?? 0 } });
            if (tier === "paid") {
              sendEvent("decision_ready", { decision: { ...cachedAnalysis, targetName: normalizedInput } });
            }
            sendEvent("analysis_complete", { analysisId: cachedAnalysis.id, slug: cachedAnalysis.slug, buildRoomId: cachedAnalysis.buildRoomId });
            controller.close();
            return;
          }

          const { analysis, decision, buildRoomId } = await runFullAnalysis({
            userId: actingUser.id,
            normalizedInput,
            inputType,
            onProgress: sendEvent
          });

          await deductCredits(actingUser.id, creditCost);

          sendEvent("analysis_complete", {
            analysisId: analysis.id,
            slug: analysis.slug,
            buildRoomId,
          });
          controller.close();
        } catch (error) {
          sendEvent("error", { message: error instanceof Error ? error.message : "An error occurred" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
