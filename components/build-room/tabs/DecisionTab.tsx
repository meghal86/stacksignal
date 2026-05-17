"use client";

import { useState } from "react";
import type { BuildRoomContent, BuildRoomOpportunity } from "@/lib/build-room/types";

function asIdeaList(value: unknown): BuildRoomOpportunity[] {
  return Array.isArray(value) ? (value as BuildRoomOpportunity[]) : [];
}

function scoreWidth(score?: number | null) {
  return `${Math.max(0, Math.min(10, score ?? 0)) * 10}%`;
}

function skipReasons(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(String);
  }
  return [String(value)];
}

export function DecisionTab({ content }: { content: BuildRoomContent }) {
  const [open, setOpen] = useState(false);
  const analysis = content.analysis;
  const selectedIdea = content.selectedIdea ?? {};
  const reasons = skipReasons(analysis?.skipReasons);
  const alternatives = asIdeaList(analysis?.topIdeas).filter((idea) => idea.name !== selectedIdea.name).slice(0, 4);
  const scores = [
    ["Demand", analysis?.demandScore],
    ["Founder Fit", analysis?.founderFitScore],
    ["Crowdedness", analysis?.crowdednessScore],
    ["WTP", analysis?.wtpScore],
    ["GTM Fit", analysis?.gtmFitScore],
    ["Complexity", analysis?.buildComplexity],
    ["Speed", analysis?.speedToRevenue],
    ["Moat", analysis?.moatScore],
    ["Platform Risk", analysis?.platformRisk],
  ] as const;

  return (
    <section className="space-y-8">
      <div className="border border-[#1A1A1A] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FF4800]">Verified BUILD Decision</p>
            <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-[#1A1A1A]">
              {selectedIdea.name ?? analysis?.rawInput ?? "Selected opportunity"}
            </h1>
          </div>
          <div className="border border-[#1A1A1A] bg-[#00C94A] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white">
            BUILD
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="border border-[#E8E4DD] bg-[#F5F0E8] px-3 py-1 font-mono text-xs uppercase tracking-[0.12em]">
            {content.businessModel ?? "Business model pending"}
          </span>
          <span className="border border-[#E8E4DD] bg-[#F5F0E8] px-3 py-1 font-mono text-xs uppercase tracking-[0.12em]">
            Confidence {analysis?.confidence ?? "?"}/10
          </span>
        </div>
        <p className="mt-6 max-w-4xl text-lg leading-8 text-[#1A1A1A]/75">
          {analysis?.verdictReasoning ?? "The BUILD verdict is being prepared from the strongest opportunity signal."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {scores.map(([label, score]) => (
          <div key={label} className="border border-[#E8E4DD] bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A]/55">{label}</span>
              <span className="font-heading text-2xl font-black text-[#1A1A1A]">{score?.toFixed(1) ?? "-"}</span>
            </div>
            <div className="mt-4 h-1 bg-[#E8E4DD]">
              <div className="h-1 bg-[#FF4800]" style={{ width: scoreWidth(score) }} />
            </div>
          </div>
        ))}
      </div>

      {analysis?.founderProfile ? (
        <div className="border border-[#00B8A0] bg-white p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#00B8A0]">Founder Advantage</p>
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#1A1A1A]/75">
            {JSON.stringify(analysis.founderProfile, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="border border-[#FFAA00] bg-[#FFF8DD] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#1A1A1A]">Founder Warning</p>
          <p className="mt-2 text-sm text-[#1A1A1A]/70">
            No founder profile is attached yet. Validate founder fit manually before spending heavily on build work.
          </p>
        </div>
      )}

      <div className="border border-[#E8E4DD] bg-white">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between px-6 py-5 text-left font-mono text-xs font-bold uppercase tracking-[0.16em]"
        >
          <span>Why not the other 4 ideas</span>
          <span>{open ? "Close" : "Open"}</span>
        </button>
        {open ? (
          <div className="border-t border-[#E8E4DD] p-6">
            {(alternatives.length ? alternatives : reasons.map((reason, index) => ({ name: `Idea ${index + 2}`, skipRisk: reason }))).map(
              (idea, index) => (
                <div key={`${idea.name ?? "idea"}-${index}`} className="border-b border-[#E8E4DD] py-3 last:border-b-0">
                  <p className="font-heading text-lg font-bold text-[#1A1A1A]">{idea.name ?? `Idea ${index + 2}`}</p>
                  <p className="mt-1 text-sm text-[#1A1A1A]/65">{idea.skipRisk ?? reasons[index] ?? "Lower fit than the selected BUILD opportunity."}</p>
                </div>
              )
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
