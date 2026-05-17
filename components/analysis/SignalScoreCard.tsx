import type { SignalScore } from "@/hooks/useAnalysis";

type SignalScoreCardProps = {
  score: SignalScore;
};

function getScoreLabel(total: number) {
  if (total >= 10) return "Strong Signal";
  if (total >= 7) return "Good Signal";
  if (total >= 4) return "Weak Signal";
  return "Noise";
}

export function SignalScoreCard({ score }: SignalScoreCardProps) {
  const total = score?.total ?? 0;
  const raw = score?.breakdown ?? {};
  const breakdown = [
    { label: "Production Proof", value: raw.productionProof ?? raw.tier1 ?? 0, max: 4 },
    { label: "Demand Proof", value: raw.demandProof ?? raw.tier2 ?? 0, max: 4 },
    { label: "Competition Gap", value: raw.competitionGap ?? raw.tier3 ?? 0, max: 2 },
    { label: "Maintenance", value: raw.maintenance ?? raw.tier4 ?? 0, max: 2 },
  ];

  return (
    <section className="border border-[#E8E4DD] bg-white p-6">
      <div className="mb-5 border-b border-[#E8E4DD] pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
          Composite Score
        </p>
        <div className="mt-2 flex items-end gap-2">
          <h2 className="font-heading text-5xl uppercase tracking-tight text-action">
            {total.toFixed(1)}
          </h2>
          <span className="pb-1 font-mono text-sm text-ink/40">/12</span>
        </div>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-ink/60">
          {getScoreLabel(total)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {breakdown.map((item) => (
          <div key={item.label} className="border border-[#E8E4DD] bg-canvas p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
              {item.label}
            </p>
            <p className="mt-2 font-heading text-2xl uppercase tracking-tight text-ink">
              {item.value}/{item.max}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
