"use client";

import Link from "next/link";
import type { DecisionResult, SignalScore, TopIdea } from "@/hooks/useAnalysis";

type DecisionFirstPanelProps = {
  ideas: TopIdea[];
  signalScore?: SignalScore | null;
  decision?: DecisionResult | null;
  locked?: boolean;
  slug?: string | null;
};

function primaryIdea(ideas: TopIdea[], decision?: DecisionResult | null) {
  return decision?.bestIdea ?? ideas[0] ?? null;
}

function evidenceForIdea(idea: TopIdea | null) {
  if (!idea) return [];
  return [
    ...(idea.signalEvidence ?? []),
    idea.marketGap ? `Market gap: ${idea.marketGap}` : null,
    idea.firstCustomerPath ? `First customer path: ${idea.firstCustomerPath}` : null,
  ].filter(Boolean).slice(0, 4) as string[];
}

function wrongWorkList(idea: TopIdea | null, decision?: DecisionResult | null) {
  const fromMvp = decision?.mvpScope?.excludedFeatures ?? [];
  const fromRisks = idea?.skipRisks?.map((risk) => risk.risk) ?? [];
  const fallback = [
    "Do not start with a broad platform before validating one painful workflow.",
    "Do not build integrations until a customer names the missing workflow.",
    "Do not chase enterprise features before proving willingness to pay.",
  ];

  const items = [...fromMvp, ...fromRisks, idea?.skipRisk].filter(Boolean).slice(0, 5) as string[];
  return items.length ? items : fallback;
}

export function DecisionFirstPanel({
  ideas,
  signalScore,
  decision,
  locked = false,
  slug,
}: DecisionFirstPanelProps) {
  const idea = primaryIdea(ideas, decision);
  if (!idea) return null;

  const verdict = decision?.verdict ?? "WATCH";
  const evidence = evidenceForIdea(idea);
  const wrongWork = wrongWorkList(idea, decision);
  const score = decision?.signalScoreTotal ?? signalScore?.total;

  return (
    <section className="overflow-hidden border border-ink bg-paper">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-ink bg-ink p-6 text-canvas lg:border-b-0 lg:border-r">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-canvas/45">
            Recommended path
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="border border-canvas/25 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em]">
              {locked ? "Verdict locked" : verdict}
            </span>
            {typeof score === "number" ? (
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-canvas/50">
                Signal {score.toFixed(1)} / 12
              </span>
            ) : null}
          </div>
          <h2 className="mt-6 font-heading text-5xl uppercase leading-[0.9] tracking-[-0.07em] sm:text-6xl">
            {locked ? "Likely path:" : "Build path:"}
            <span className="mt-2 block text-action">{idea.name}</span>
          </h2>
          <p className="mt-5 text-sm leading-6 text-canvas/65">{idea.oneLiner}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {decision?.verdict === "BUILD" && decision.buildRoomId ? (
              <Link
                href={`/build-room/${decision.buildRoomId}`}
                className="border border-canvas bg-canvas px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink"
              >
                Open Build Room →
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="border border-canvas bg-action px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white"
              >
                Unlock decision →
              </Link>
            )}
            {slug ? (
              <Link
                href={`/report/${slug}`}
                className="border border-canvas/25 px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-canvas"
              >
                Report
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-ink/10 p-6 md:border-b-0 md:border-r">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ink/42">
              Why this path
            </p>
            <div className="mt-5 space-y-3">
              {evidence.length ? (
                evidence.map((item) => (
                  <p key={item} className="text-sm leading-6 text-ink/70">
                    ↳ {item}
                  </p>
                ))
              ) : (
                <p className="text-sm leading-6 text-ink/60">
                  Signal evidence is still being collected for this opportunity.
                </p>
              )}
            </div>
          </div>

          <div className="p-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-action">
              Wrong work to skip
            </p>
            <div className="mt-5 space-y-3">
              {wrongWork.map((item) => (
                <p key={item} className="text-sm leading-6 text-ink/70">
                  × {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
