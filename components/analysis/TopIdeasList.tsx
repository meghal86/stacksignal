"use client";

import type { TopIdea } from "@/hooks/useAnalysis";
import { IdeaCard } from "./IdeaCard";

type TopIdeasListProps = {
  ideas: TopIdea[];
  tier: "free" | "paid";
  onUnlockClick?: () => void;
  onSelectIdea?: (idea: TopIdea) => void;
};

export function TopIdeasList({ ideas, tier, onUnlockClick }: TopIdeasListProps) {
  if (!ideas || ideas.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
            Generated Output
          </p>
          <h2 className="font-heading text-3xl uppercase tracking-tight text-ink">
            Top Ideas
          </h2>
        </div>
      </div>

      <div>
        {ideas.map((idea, i) => {
          const rank = idea.rank ?? i + 1;
          const isLocked = tier === "free" && rank > 2;
          return (
            <IdeaCard
              key={`${idea.name}-${i}`}
              idea={idea}
              rank={rank}
              isLocked={isLocked}
              onUnlockClick={onUnlockClick}
            />
          );
        })}

        {tier === "free" && (
          <div className="text-center pt-4 pb-2">
            <p className="text-xs text-[#8A8680] mb-3">
              Ideas #3, #4, #5 are locked
            </p>
            <button
              onClick={onUnlockClick}
              className="bg-[#FF4800] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 hover:bg-[#CC3A00] transition-colors"
            >
              Unlock all 5 ideas — $29
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
