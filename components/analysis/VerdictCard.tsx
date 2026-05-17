import Image from "next/image";
import Link from "next/link";
import type { DecisionResult } from "@/hooks/useAnalysis";

type VerdictCardProps = {
  verdict: DecisionResult;
};

const VERDICT_STYLES = {
  BUILD: "bg-[#00C94A]",
  SKIP: "bg-[#FF2B2B]",
  WATCH: "bg-[#FFAA00]",
} as const;

const MASCOT_MAP = {
  BUILD: "/mascots/scout-celebrate.png",
  WATCH: "/mascots/scout-search.png",
} as const;

const EMOJI_MAP = {
  BUILD: "🎯",
  SKIP: "🚫",
  WATCH: "👀",
} as const;

export function VerdictCard({ verdict }: VerdictCardProps) {
  const verdictLabel = verdict.verdict;
  const buildRoomHref =
    verdict.verdict === "BUILD" && verdict.buildRoomId
      ? `/build-room/${verdict.buildRoomId}`
      : null;
  const scoreColumns = [
    { label: "Demand", value: verdict.scores.demand },
    { label: "Market Gap", value: verdict.scores.crowdedness },
    { label: "Founder Fit", value: verdict.scores.founderFit },
    { label: "Speed", value: verdict.scores.speedToRevenue },
  ];
  const mascotSrc =
    verdictLabel === "SKIP" ? null : MASCOT_MAP[verdictLabel];

  return (
    <section className="relative overflow-hidden border border-[#E8E4DD] bg-white p-6">
      <div className="absolute bottom-2 right-3 select-none font-heading text-7xl uppercase leading-none text-ink/[0.04]">
        {verdictLabel}
      </div>

      <div className="relative z-10">
        <div className="mb-5 border-b border-[#E8E4DD] pb-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
                {verdict.targetName ?? verdict.bestIdea.name} · Signal score{" "}
                {verdict.signalScoreTotal?.toFixed(1) ?? "0.0"} / 12
              </p>
              <h2 className="mt-2 font-heading text-4xl uppercase tracking-tight text-ink">
                {verdict.verdict === "BUILD" ? "Build this:" : verdict.verdict === "SKIP" ? "Do not build:" : "Watch this:"}{" "}
                <span className="text-action">{verdict.bestIdea.name}</span>
              </h2>
            </div>

            <span
              className={[
                "px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-white",
                VERDICT_STYLES[verdictLabel],
              ].join(" ")}
            >
              {verdictLabel}
            </span>
          </div>

          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink/55">
            Confidence: {verdict.confidence}/10
          </p>
        </div>

        {mascotSrc ? (
          <Image
            src={mascotSrc}
            alt=""
            width={72}
            height={72}
            className="absolute right-3 top-[-24px] rotate-[8deg]"
          />
        ) : (
          <div className="absolute right-3 top-[-18px] text-4xl">
            {EMOJI_MAP[verdictLabel]}
          </div>
        )}

        <div className="mb-5 border-b border-[#E8E4DD] pb-5">
          <p className="text-base leading-7 text-ink/80">{verdict.reasoning}</p>
        </div>

        <div className="mb-5 border-b border-[#E8E4DD] pb-5">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
            Scores
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {scoreColumns.map((column) => (
              <div key={column.label}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                  {column.label}
                </p>
                <p className="mt-2 font-heading text-3xl uppercase tracking-tight text-ink">
                  {column.value.toFixed(1)}
                </p>
                <div className="mt-3 h-1 bg-[#E8E4DD]">
                  <div
                    className="h-full bg-action"
                    style={{ width: `${Math.max(0, Math.min(column.value * 10, 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5 border-b border-[#E8E4DD] pb-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
            Why Not The Others / Wrong Work To Skip
          </p>

          <div className="space-y-2">
            {verdict.skipReasons.map((reason) => (
              <p key={`${reason.ideaName}-${reason.reason}`} className="text-sm text-ink/75">
                • {reason.ideaName}: {reason.reason}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {buildRoomHref ? (
            <Link
              href={buildRoomHref}
              className="border border-ink bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-white"
            >
              Open Build Room →
            </Link>
          ) : null}

          <button
            type="button"
            className="border border-[#E8E4DD] bg-canvas px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-ink"
          >
            Save Report
          </button>
        </div>
      </div>
    </section>
  );
}
