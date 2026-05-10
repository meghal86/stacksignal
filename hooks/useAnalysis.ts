"use client";

import { useCallback, useMemo, useState } from "react";

export type StepStatus = "pending" | "running" | "complete" | "error";

export type AnalysisStep = {
  id: string;
  label: string;
  status: StepStatus;
  summary?: string;
};

export type TopIdea = {
  rank: number;
  name: string;
  category: string;
  oneLiner: string;
  signalEvidence: string[];
  targetCustomer: string;
  roughPricing: string;
  buildWeeks: number;
  skipRisk: string;
};

export type ValidationDay = {
  day: number;
  action: string;
  goal: string;
  successSignal: string;
};

export type SignalScore = {
  total: number;
  breakdown: Record<string, number>;
};

export type DecisionResult = {
  bestIdea: TopIdea;
  verdict: "BUILD" | "WATCH" | "SKIP";
  confidence: number;
  reasoning: string;
  scores: {
    demand: number;
    founderFit: number;
    crowdedness: number;
    wtp: number;
    gtmFit: number;
    buildComplexity: number;
    speedToRevenue: number;
    moat: number;
    platformRisk: number;
    composite: number;
  };
  skipReasons: Array<{
    ideaName: string;
    reason: string;
  }>;
  validationPlan: ValidationDay[];
  mvpScope: {
    coreFeatures: string[];
    excludedFeatures: string[];
    firstCustomerPath: string;
  };
  founderAdvantage: string | null;
  founderWarning: string | null;
  signalScoreTotal?: number;
  buildRoomId?: string | null;
  targetName?: string;
};

type StreamEnvelope =
  | { event: "signal_start"; data: { stepId: string } }
  | {
      event: "signal_complete";
      data: { stepId: string; summary?: string };
    }
  | { event: "signal_error"; data: { stepId: string; message?: string } }
  | {
      event: "ideas_ready";
      data: { ideas: TopIdea[]; signalScore: SignalScore };
    }
  | { event: "decision_start"; data: Record<string, never> }
  | {
      event: "decision_ready";
      data: { decision: DecisionResult };
    }
  | {
      event: "analysis_complete";
      data: {
        analysisId: string | null;
        slug: string;
        buildRoomId: string | null;
      };
    }
  | { event: "error"; data: { message: string } };

function createSteps(tier: "free" | "paid"): AnalysisStep[] {
  const baseSteps: AnalysisStep[] = [
    { id: "github_signals", label: "Fetching GitHub signals", status: "pending" },
    { id: "github_issues", label: "Analyzing 90-day issues", status: "pending" },
    { id: "package_downloads", label: "Checking package downloads", status: "pending" },
    { id: "hn_demand", label: "Searching HN demand posts", status: "pending" },
    { id: "competition_check", label: "Running competition check", status: "pending" },
    { id: "scoring", label: "Scoring opportunity", status: "pending" },
    { id: "top_ideas", label: "Generating top ideas", status: "pending" },
  ];

  if (true) { // temporarily unlock all tiers
    baseSteps.push({
      id: "verdict",
      label: "Generating Build/Skip/Watch verdict",
      status: "pending",
    });
  }

  return baseSteps;
}

function updateStep(
  steps: AnalysisStep[],
  stepId: string,
  status: StepStatus,
  summary?: string
) {
  return steps.map((step) =>
    step.id === stepId ? { ...step, status, summary: summary ?? step.summary } : step
  );
}

export function useAnalysis() {
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [ideas, setIdeas] = useState<TopIdea[] | null>(null);
  const [signalScore, setSignalScore] = useState<SignalScore | null>(null);
  const [decision, setDecision] = useState<DecisionResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<"free" | "paid">("free");

  const reset = useCallback(() => {
    setStatus("idle");
    setSteps([]);
    setIdeas(null);
    setSignalScore(null);
    setDecision(null);
    setAnalysisId(null);
    setSlug(null);
    setError(null);
    setCurrentTier("free");
  }, []);

  const analyze = useCallback(async (input: string, tier: "free" | "paid") => {
    setStatus("analyzing");
    setCurrentTier(tier);
    setSteps(createSteps(tier));
    setIdeas(null);
    setSignalScore(null);
    setDecision(null);
    setAnalysisId(null);
    setSlug(null);
    setError(null);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, tier }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus("error");
      setError(payload.error ?? "Analysis request failed");
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      setStatus("error");
      setError("No response stream available");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let latestSignalScore: SignalScore | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const dataLine = block
            .split("\n")
            .find((line) => line.startsWith("data: "));

          if (!dataLine) {
            continue;
          }

          const envelope = JSON.parse(dataLine.slice(6)) as StreamEnvelope;

          switch (envelope.event) {
            case "signal_start":
              setSteps((current) => updateStep(current, envelope.data.stepId, "running"));
              break;

            case "signal_complete":
              setSteps((current) =>
                updateStep(
                  current,
                  envelope.data.stepId,
                  "complete",
                  envelope.data.summary
                )
              );
              break;

            case "signal_error":
              setSteps((current) => updateStep(current, envelope.data.stepId, "error"));
              break;

            case "ideas_ready":
              setIdeas(envelope.data.ideas);
              setSignalScore(envelope.data.signalScore);
              latestSignalScore = envelope.data.signalScore;
              break;

            case "decision_start":
              setSteps((current) => updateStep(current, "verdict", "running"));
              break;

            case "decision_ready":
              setDecision({
                ...envelope.data.decision,
                signalScoreTotal:
                  envelope.data.decision.signalScoreTotal ?? latestSignalScore?.total,
              });
              setSteps((current) => updateStep(current, "verdict", "complete"));
              break;

            case "analysis_complete":
              setAnalysisId(envelope.data.analysisId);
              setSlug(envelope.data.slug);
              setDecision((current) =>
                current
                  ? { ...current, buildRoomId: envelope.data.buildRoomId }
                  : current
              );
              setStatus("complete");
              break;

            case "error":
              setStatus("error");
              setError(envelope.data.message);
              break;
          }
        }
      }
    } catch (streamError) {
      setStatus("error");
      setError(
        streamError instanceof Error ? streamError.message : "Streaming failed"
      );
    }
  }, []);

  return useMemo(
    () => ({
      status,
      steps,
      ideas,
      signalScore,
      decision,
      analysisId,
      slug,
      error,
      currentTier,
      analyze,
      reset,
    }),
    [
      status,
      steps,
      ideas,
      signalScore,
      decision,
      analysisId,
      slug,
      error,
      currentTier,
      analyze,
      reset,
    ]
  );
}
