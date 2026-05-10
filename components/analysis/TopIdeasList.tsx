import type { TopIdea } from "@/hooks/useAnalysis";

type TopIdeasListProps = {
  ideas: TopIdea[];
  tier: "free" | "paid";
  onSelectIdea?: (idea: TopIdea) => void;
};

export function TopIdeasList({
  ideas,
  tier,
  onSelectIdea,
}: TopIdeasListProps) {
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

      <div className="space-y-4">
        {ideas.map((idea, index) => {
          const isLocked = false; // tier === "free" && index >= 2;

          return (
            <button
              key={`${idea.rank}-${idea.name}`}
              type="button"
              onClick={() => !isLocked && onSelectIdea?.(idea)}
              className="relative block w-full overflow-hidden border border-[#E8E4DD] bg-white p-5 text-left transition-colors hover:border-action disabled:cursor-default"
              disabled={isLocked && !onSelectIdea}
            >
              <div className={isLocked ? "pointer-events-none blur-[2px]" : ""}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={[
                        "flex h-8 min-w-8 items-center justify-center border px-2 font-mono text-xs font-bold",
                        index === 0
                          ? "border-action bg-action text-white"
                          : "border-[#E8E4DD] bg-canvas text-ink",
                      ].join(" ")}
                    >
                      #{idea.rank}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                        {idea.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-insight px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
                          {idea.category.replaceAll("_", " ")}
                        </span>
                        <span className="rounded-full bg-clarity px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
                          {idea.roughPricing}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/45">
                    {idea.buildWeeks} weeks
                  </p>
                </div>

                <p className="mb-4 text-sm text-ink/70">{idea.oneLiner}</p>

                <ul className="mb-4 space-y-1">
                  {idea.signalEvidence.slice(0, 3).map((evidence) => (
                    <li
                      key={evidence}
                      className="font-mono text-xs text-ink/75"
                    >
                      • {evidence}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E4DD] pt-4">
                  <p className="text-sm italic text-ink/55">{idea.targetCustomer}</p>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-red-500">
                    {idea.skipRisk}
                  </p>
                </div>
              </div>

              {isLocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(245,240,232,0.88)]">
                  <div className="text-2xl text-ink">🔒</div>
                  <p className="font-heading text-lg uppercase tracking-tight text-ink">
                    Unlock all 5 ideas
                  </p>
                  <span
                    className="border border-action bg-action px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-white"
                  >
                    Get verdict — $29
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
