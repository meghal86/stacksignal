"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAnalysis } from "@/hooks/useAnalysis";
import { AnalysisInput } from "@/components/analysis/AnalysisInput";
import { ProgressSteps } from "@/components/analysis/ProgressSteps";
import { TopIdeasList } from "@/components/analysis/TopIdeasList";
import { VerdictCard } from "@/components/analysis/VerdictCard";
import { SignalScoreCard } from "@/components/analysis/SignalScoreCard";
import { ValidationPlan } from "@/components/analysis/ValidationPlan";
import { Navbar } from "@/components/layout/Navbar";

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInput = searchParams.get("input");
  const tier = searchParams.get("tier") === "paid" ? "paid" : "free";
  const startedRef = useRef(false);

  const { status, steps, ideas, signalScore, decision, error, analyze, reset } =
    useAnalysis();

  useEffect(() => {
    if (!initialInput || startedRef.current) {
      return;
    }

    startedRef.current = true;
    analyze(initialInput, tier);
  }, [analyze, initialInput, tier]);

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
            Analyze
          </p>
          <h1 className="mt-2 font-heading text-5xl uppercase tracking-tight text-ink">
            Find the right signal
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/70">
            Turn repo, package, or ecosystem demand into ranked business ideas and
            a build decision.
          </p>
        </div>

        {status === "idle" ? (
          <AnalysisInput onSubmit={(input) => analyze(input, "free")} />
        ) : null}

        {status === "analyzing" ? (
          <div className="space-y-6">
            <ProgressSteps steps={steps} />
            {signalScore ? <SignalScoreCard score={signalScore} /> : null}
            {ideas ? <TopIdeasList ideas={ideas} tier={tier} /> : null}
            {decision ? <VerdictCard verdict={decision} /> : null}
            {decision?.validationPlan ? (
              <ValidationPlan plan={decision.validationPlan} />
            ) : null}
          </div>
        ) : null}

        {(status === "complete" || ideas) && status !== "error" ? (
          <div className="space-y-6">
            {signalScore ? <SignalScoreCard score={signalScore} /> : null}
            {ideas ? <TopIdeasList ideas={ideas} tier={tier} /> : null}
            {decision ? <VerdictCard verdict={decision} /> : null}
            {decision?.validationPlan ? (
              <ValidationPlan plan={decision.validationPlan} />
            ) : null}

            <button
              type="button"
              onClick={() => {
                reset();
                startedRef.current = false;
                router.push("/analyze");
              }}
              className="border border-[#E8E4DD] bg-white px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-ink"
            >
              Analyze another →
            </button>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="space-y-4 border border-red-300 bg-white p-6">
            <p className="font-heading text-2xl uppercase tracking-tight text-red-500">
              Analysis error
            </p>
            <p className="text-sm text-ink/70">{error}</p>
            <button
              type="button"
              onClick={() => {
                reset();
                startedRef.current = false;
                router.push("/analyze");
              }}
              className="border border-[#E8E4DD] bg-canvas px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-ink"
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-canvas" />}>
      <AnalyzeContent />
    </Suspense>
  );
}
