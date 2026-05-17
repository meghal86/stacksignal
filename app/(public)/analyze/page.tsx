"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAnalysis } from "@/hooks/useAnalysis";
import { AnalysisInput } from "@/components/analysis/AnalysisInput";
import { ProgressSteps } from "@/components/analysis/ProgressSteps";
import { TopIdeasList } from "@/components/analysis/TopIdeasList";
import { VerdictCard } from "@/components/analysis/VerdictCard";
import { SignalScoreCard } from "@/components/analysis/SignalScoreCard";
import { ValidationPlan } from "@/components/analysis/ValidationPlan";
import { SignalArtwork } from "@/components/brand/SignalArtwork";
import { DecisionFirstPanel } from "@/components/analysis/DecisionFirstPanel";

function AnalyzeContent() {
  const params = useSearchParams();
  const initialInput = params.get("q") || params.get("input") || "";
  const tier = params.get("tier") === "paid" ? "paid" : "free";
  const startedRef = useRef(false);
  const { status, steps, ideas, signalScore, decision, slug, error, analyze, reset } = useAnalysis();

  useEffect(() => {
    if (initialInput && status === "idle" && !startedRef.current) {
      startedRef.current = true;
      analyze(initialInput, tier);
    }
  }, [analyze, initialInput, status, tier]);

  return (
    <main className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-28">
          <SignalArtwork label="Analysis scanner" compact />
          <div className="mt-4 border border-ink bg-ink p-5 text-canvas">
            <p className="font-heading text-4xl uppercase leading-none tracking-[-0.06em]">
              Live scan, not a form.
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase leading-5 tracking-[0.16em] text-canvas/60">
              Progress appears as each source resolves. Free users see the ideas; paid users unlock the decision.
            </p>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
      {status === "idle" ? (
        <div className="ink-card p-5 sm:p-8">
          <p className="kicker">Live analysis</p>
          <h1 className="mt-3 display-title text-6xl uppercase sm:text-8xl">Feed the scout.</h1>
          <p className="mt-5 mb-8 max-w-xl text-ink/62">Paste a repo, package, or idea. StackSignal will fetch live signals and generate opportunities.</p>
          <div className="border border-ink bg-paper p-3">
            <AnalysisInput defaultValue={initialInput} onSubmit={(input) => analyze(input, "free")} />
          </div>
        </div>
      ) : null}

      {status === "analyzing" ? (
        <div className="space-y-8">
          <div className="ink-card p-6">
            <p className="kicker">Signal Scout running</p>
            <h2 className="mt-2 font-heading text-5xl uppercase tracking-[-0.06em] text-[#1A1A1A]">Scanning signals...</h2>
            <p className="mt-2 text-[#1A1A1A]/55">Fetching live data from GitHub, npm, HN, and more.</p>
          </div>
          <ProgressSteps steps={steps} />

          {ideas && ideas.length > 0 ? (
            <div className="mt-8">
              <h3 className="mb-4 font-heading text-2xl font-black tracking-tight">Recommended path forming</h3>
              <DecisionFirstPanel ideas={ideas} signalScore={signalScore} locked slug={slug} />
              <div className="mt-8">
                <TopIdeasList ideas={ideas} tier="free" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {status === "complete" ? (
        <div className="space-y-8">
          {ideas ? (
            <div>
              <DecisionFirstPanel ideas={ideas} signalScore={signalScore} decision={decision} locked={!decision} slug={slug} />
            </div>
          ) : null}

          {signalScore ? (
            <div>
              <SignalScoreCard score={signalScore} />
            </div>
          ) : null}

          {ideas ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-3xl font-black tracking-tight">Other business paths</h2>
                <span className="text-sm text-[#1A1A1A]/45">Ranked below the main recommendation</span>
              </div>
              <TopIdeasList ideas={ideas} tier="free" />
            </div>
          ) : null}

          {!decision ? (
            <div className="relative overflow-hidden border border-ink bg-ink p-8 text-center text-canvas">
              <div className="absolute -right-5 -top-8 font-heading text-[120px] leading-none text-white/[0.04]">LOCK</div>
              <div className="mb-3 text-4xl">◉</div>
              <h3 className="mb-2 font-heading text-4xl font-black uppercase tracking-[-0.06em]">Build, Skip, or Watch?</h3>
              <p className="mx-auto mb-5 max-w-xl text-sm leading-6 text-canvas/65">
                Get the full verdict: which of these 5 ideas is worth building, which 4 to skip and why, plus a 7-day validation plan.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/pricing" className="bg-[#FF4800] px-6 py-3 text-sm font-bold uppercase tracking-wider text-white">
                  Get verdict — $29
                </Link>
                <Link href="/pricing" className="border border-[#E8E4DD] bg-white px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Subscribe $19/mo
                </Link>
              </div>
            </div>
          ) : null}

          {decision ? (
            <div className="mb-8">
              <VerdictCard verdict={decision} />
              {decision.validationPlan ? (
                <div className="mt-4">
                  <ValidationPlan plan={decision.validationPlan} />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-3 border-t border-[#1A1A1A]/15 pt-4">
            {slug ? (
              <Link href={`/report/${slug}`} className="text-sm font-bold text-[#FF4800]">
                View shareable report →
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                startedRef.current = false;
                reset();
              }}
              className="ml-auto text-sm text-[#1A1A1A]/40"
            >
              Analyze another repo
            </button>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="ink-card py-12 text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="mb-2 font-heading text-3xl font-black tracking-tight">Analysis failed</h2>
          <p className="mb-4 text-[#1A1A1A]/55">{error}</p>
          <button type="button" onClick={reset} className="font-bold text-[#FF4800]">
            Try again →
          </button>
        </div>
      ) : null}
      </section>
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F5F0E8]" />}>
      <AnalyzeContent />
    </Suspense>
  );
}
