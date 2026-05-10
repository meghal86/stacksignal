import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { EmailCapture } from "@/components/marketing/EmailCapture";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Leaderboard — StackSignal",
  description: "Live Build/Skip/Watch verdicts for trending developer tools. See which tools are worth building on and which to avoid.",
};

export const revalidate = 300; // Revalidate every 5 minutes

export default async function LeaderboardPage() {
  const analyses = await prisma.analysis.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      target: true,
    },
    where: {
      verdict: { not: null },
    },
  });

  const buildCount = analyses.filter((a) => a.verdict === "BUILD").length;
  const skipCount = analyses.filter((a) => a.verdict === "SKIP").length;
  const watchCount = analyses.filter((a) => a.verdict === "WATCH").length;

  return (
    <div className="min-h-screen bg-canvas text-ink relative overflow-hidden">
      {/* Background Graffiti */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.02]">
        <div className="absolute top-[5%] right-[-5%] text-[18vw] font-heading rotate-[8deg] uppercase">VERDICTS</div>
        <div className="absolute bottom-[15%] left-[-3%] text-[12vw] font-heading -rotate-[6deg] uppercase text-action">SKIP</div>
      </div>

      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        {/* Header */}
        <div className="mb-20 pb-16 border-b-4 border-ink">
          <Badge variant="watch" className="mb-6 px-4 py-1 text-[10px] border-2 border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            LIVE FEED
          </Badge>
          <h1 className="text-7xl md:text-9xl font-heading uppercase tracking-tighter leading-[0.8] mb-8">
            SIGNAL<br />
            <span className="text-action">LEADERBOARD</span>
          </h1>
          <p className="text-xl text-ink/60 font-medium max-w-2xl">
            Real-time Build/Skip/Watch verdicts for the developer ecosystem. 
            We analyze GitHub velocity, market crowdedness, and demand signals — so you don't have to.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-0 border-2 border-ink mb-16">
          <div className="p-8 text-center border-r-2 border-ink bg-white">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/40 font-bold mb-2">Build</p>
            <p className="text-5xl font-heading text-action">{buildCount}</p>
          </div>
          <div className="p-8 text-center border-r-2 border-ink bg-white">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/40 font-bold mb-2">Skip</p>
            <p className="text-5xl font-heading text-ink">{skipCount}</p>
          </div>
          <div className="p-8 text-center bg-white">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/40 font-bold mb-2">Watch</p>
            <p className="text-5xl font-heading text-insight">{watchCount}</p>
          </div>
        </div>

        {/* Verdict List */}
        <div className="space-y-4">
          {/* SKIP Section — Featured Prominently */}
          {skipCount > 0 && (
            <div className="mb-16">
              <div className="flex items-center gap-6 mb-8">
                <h2 className="text-4xl font-heading uppercase tracking-tighter italic text-ink">Skip Signals</h2>
                <div className="flex-1 h-0.5 bg-ink/5" />
                <Badge variant="skip" className="border-2 border-ink px-4 py-1 text-[10px]">HIGH PRIORITY</Badge>
              </div>
              <div className="space-y-3">
                {analyses
                  .filter((a) => a.verdict === "SKIP")
                  .map((item, i) => (
                    <LeaderboardRow key={item.id} item={item} rank={i + 1} featured />
                  ))}
              </div>
            </div>
          )}

          {/* BUILD Section */}
          {buildCount > 0 && (
            <div className="mb-16">
              <div className="flex items-center gap-6 mb-8">
                <h2 className="text-4xl font-heading uppercase tracking-tighter italic text-action">Build Signals</h2>
                <div className="flex-1 h-0.5 bg-action/10" />
              </div>
              <div className="space-y-3">
                {analyses
                  .filter((a) => a.verdict === "BUILD")
                  .map((item, i) => (
                    <LeaderboardRow key={item.id} item={item} rank={i + 1} />
                  ))}
              </div>
            </div>
          )}

          {/* WATCH Section */}
          {watchCount > 0 && (
            <div className="mb-16">
              <div className="flex items-center gap-6 mb-8">
                <h2 className="text-4xl font-heading uppercase tracking-tighter italic text-insight">Watch List</h2>
                <div className="flex-1 h-0.5 bg-insight/10" />
              </div>
              <div className="space-y-3">
                {analyses
                  .filter((a) => a.verdict === "WATCH")
                  .map((item, i) => (
                    <LeaderboardRow key={item.id} item={item} rank={i + 1} />
                  ))}
              </div>
            </div>
          )}

          {analyses.length === 0 && (
            <div className="p-24 border-2 border-dashed border-ink/10 text-center">
              <p className="font-heading text-3xl uppercase opacity-20 tracking-widest italic mb-4">
                No signals tracked yet
              </p>
              <Link href="/">
                <Button variant="outline" className="font-heading uppercase">
                  Run First Analysis
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Email Capture */}
        <div className="mt-24">
          <EmailCapture source="leaderboard" variant="banner" />
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-16 border-t-2 border-ink/5 flex justify-between items-center opacity-40">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em]">© 2026 STACKSIGNAL ENGINE</p>
        <p className="text-2xl font-heading uppercase tracking-tighter italic">STACKSIGNAL 2026</p>
      </footer>

      <div className="h-2 w-full bg-spectrum" />
    </div>
  );
}

function LeaderboardRow({ item, rank, featured }: { item: any; rank: number; featured?: boolean }) {
  const verdictColor = item.verdict === "BUILD"
    ? "text-action"
    : item.verdict === "SKIP"
      ? "text-ink"
      : "text-insight";

  const score = item.demandScore ?? item.crowdednessScore ?? 0;

  return (
    <Link
      href={`/report/${item.slug}`}
      className={`
        flex items-center justify-between p-6 border-2 bg-white transition-all group relative overflow-hidden
        ${featured
          ? "border-ink hover:bg-canvas hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          : "border-ink/30 hover:border-ink hover:bg-canvas hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
        }
      `}
    >
      {/* Rank */}
      <div className="w-12 h-12 flex items-center justify-center border-2 border-ink/10 font-heading text-xl group-hover:bg-action group-hover:text-white group-hover:border-action transition-all">
        {rank}
      </div>

      {/* Info */}
      <div className="flex-1 ml-6">
        <div className="flex items-center gap-4">
          <h3 className="font-heading text-2xl uppercase tracking-tighter group-hover:text-action transition-colors truncate max-w-[300px]">
            {item.target?.displayName || item.rawInput}
          </h3>
          <Badge variant={(item.verdict?.toLowerCase()) || "watch"} className="border-2 border-ink px-3 py-0.5 text-[9px]">
            {item.verdict}
          </Badge>
        </div>
        <div className="flex items-center gap-6 mt-2">
          <p className="font-mono text-[10px] text-ink/40 uppercase tracking-widest font-bold">
            {item.target?.type?.replace("_", " ") || "TARGET"}
          </p>
          <p className="font-mono text-[10px] text-ink/30 uppercase">
            {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          {item.verdictReasoning && (
            <p className="font-mono text-[10px] text-ink/40 truncate max-w-[400px] hidden lg:block">
              {item.verdictReasoning}
            </p>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-right ml-6">
        <p className="font-mono text-[9px] text-ink/30 uppercase tracking-widest mb-1">Score</p>
        <p className={`text-3xl font-heading ${verdictColor}`}>
          {typeof score === "number" ? score.toFixed(1) : "—"}
        </p>
      </div>

      {/* Ghost Text */}
      <div className="absolute -bottom-2 -right-4 text-8xl font-heading opacity-0 group-hover:opacity-[0.03] transition-opacity uppercase pointer-events-none select-none">
        {item.verdict}
      </div>
    </Link>
  );
}
