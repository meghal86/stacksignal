import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmailCapture } from "@/components/marketing/EmailCapture";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { calculateSignalScore } from "@/lib/scoring/signals";

function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 30) return `${Math.floor(diffDays / 30)} months`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? "s" : ""}`;
  return "just now";
}

export default async function ReportPage({ params }: { params: { slug: string } }) {
  const analysis = await prisma.analysis.findUnique({
    where: { slug: params.slug },
    include: {
      target: true,
    },
  });

  if (!analysis) {
    notFound();
  }

  const signalMetrics = analysis.target?.signalData as any;
  const signalScore = signalMetrics ? calculateSignalScore({
    weeklyDownloads: signalMetrics.package?.weeklyDownloads,
    stars: signalMetrics.github?.stars,
    hostingRequestsLast90d: signalMetrics.github?.hostingRequestsLast90d,
    enterpriseRequestsLast90d: signalMetrics.github?.enterpriseRequestsLast90d,
    unsolvedPosts: signalMetrics.hn?.unsolvedPosts,
    crowdednessScore: signalMetrics.competition?.crowdednessScore,
    lastCommitDays: signalMetrics.github?.lastCommitDays,
    velocityTrend: signalMetrics.github?.velocityTrend,
    skipSignalsFound: signalMetrics.github?.skipSignalsFound,
    isArchived: signalMetrics.github?.isArchived,
  }) : { total: 0, breakdown: {} };

  const verdict = (analysis.verdict?.toLowerCase() as "build" | "skip" | "watch") || "watch";

  const mascotMap = {
    build: "/mascots/scout-celebrate.png",
    skip: "/mascots/scout-empty.png",
    watch: "/mascots/scout-search.png",
  };

  const topIdeas = Array.isArray(analysis.topIdeas) ? (analysis.topIdeas as any[]) : [];
  const targetName = analysis.target?.displayName || analysis.rawInput;
  const targetType = analysis.target?.type || "PACKAGE";

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-action/20">
      {/* Navigation */}
      <nav className="border-b border-ink/10 px-6 py-4 flex items-center justify-between bg-canvas/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="text-2xl font-heading tracking-tight hover:text-action transition-colors">
          SIGNAL SCOUT
        </Link>
        <div className="flex items-center gap-8 font-heading text-sm uppercase tracking-wider">
          <Link href="/dashboard">
            <Button size="sm" variant="outline">Dashboard</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 relative">
        {/* Decorative background sticker */}
        <div className="absolute top-24 right-0 opacity-10 pointer-events-none rotate-12">
          <Image src="/ui/sticker-scout.png" alt="" width={300} height={300} />
        </div>

        {/* Report Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12 mb-20 pb-12 border-b border-ink/10 relative">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <Badge variant="default" className="bg-ink text-canvas border-0">{targetType.replace('_', ' ')}</Badge>
              <span className="font-mono text-[10px] text-ink/40 uppercase tracking-widest">
                ANALYZED {formatDistanceToNow(analysis.createdAt).toUpperCase()} AGO
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-heading mb-6 uppercase leading-none tracking-tighter">
              {targetName}
            </h1>
            <p className="text-xl md:text-2xl text-ink/60 max-w-2xl font-medium leading-tight">
              Analyzing ecosystem volatility and commercial viability for <span className="text-ink">{targetName}</span>.
            </p>
          </div>
          
          <div className="flex flex-col items-center lg:items-end gap-4 relative">
            <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
              {/* Spray ring background for BUILD */}
              {verdict === "build" && (
                <div className="absolute inset-0 animate-pulse-slow">
                  <Image 
                    src="/ui/score-spray-ring.png" 
                    alt="" 
                    fill 
                    className="object-contain opacity-80"
                  />
                </div>
              )}
              
              <div className="relative z-10 w-4/5 h-4/5">
                <Image 
                  src={mascotMap[verdict]} 
                  alt="Scout Verdict" 
                  fill 
                  className="object-contain"
                />
              </div>
            </div>
            <div className="text-center lg:text-right">
              <p className="font-mono text-[10px] text-ink/40 uppercase mb-2 tracking-[0.2em]">SIGNAL VERDICT</p>
              <Badge 
                variant={verdict} 
                className="text-6xl md:text-8xl px-12 py-4 border-4 border-ink shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                {verdict.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Signal Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
          {[
            { 
              label: "Production Proof", 
              value: signalScore.breakdown.tier1?.toFixed(1) || "0.0", 
              detail: signalMetrics?.package?.weeklyDownloads 
                ? `${(signalMetrics.package.weeklyDownloads / 1000000).toFixed(1)}M+ Downloads/wk`
                : `${(signalMetrics?.github?.stars || 0).toLocaleString()} Stars`,
              color: "text-clarity",
              max: 4
            },
            { 
              label: "Demand Proof", 
              value: signalScore.breakdown.tier2?.toFixed(1) || "0.0", 
              detail: `${signalMetrics?.hn?.unsolvedPosts || 0} Unsolved Posts`,
              color: "text-action",
              max: 4
            },
            { 
              label: "Competition Gap", 
              value: signalScore.breakdown.tier3?.toFixed(1) || "0.0", 
              detail: `${signalMetrics?.competition?.competitors?.length || 0} Competitors`,
              color: "text-ink/40",
              max: 2
            },
            { 
              label: "Health Signals", 
              value: signalScore.breakdown.tier4?.toFixed(1) || "0.0", 
              detail: signalMetrics?.github?.lastCommitDays 
                ? `Last commit ${signalMetrics.github.lastCommitDays}d ago`
                : "Active development",
              color: "text-insight",
              max: 2
            },
          ].map((metric, i) => (
            <div key={i} className="p-8 border-2 border-ink bg-canvas hover:bg-white transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
                <Image src="/icons/signal-antenna.svg" alt="" width={40} height={40} />
              </div>
              <p className="font-mono text-[10px] text-ink/40 mb-4 uppercase tracking-[0.2em]">{metric.label}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className={`text-6xl font-heading ${metric.color}`}>{metric.value}</p>
                <p className="font-mono text-xs text-ink/20">/ {metric.max.toFixed(1)}</p>
              </div>
              <p className="font-mono text-[10px] text-ink/60 uppercase font-bold">{metric.detail}</p>
              <div className="mt-8 h-2 w-full bg-ink/5 overflow-hidden">
                <div 
                  className="h-full bg-ink group-hover:bg-action transition-all duration-700" 
                  style={{ width: `${(Number(metric.value) / metric.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top Ideas Section */}
        <section className="mb-24 relative">
          {/* Trust sticker */}
          <div className="absolute -top-12 -left-12 rotate-[-15deg] z-20 hidden md:block">
            <Image src="/ui/sticker-trust.png" alt="Trust The Signal" width={120} height={120} />
          </div>

          <div className="flex items-center gap-6 mb-16">
            <h2 className="text-5xl md:text-6xl font-heading uppercase tracking-tighter italic">TOP OPPORTUNITIES</h2>
            <div className="flex-1 h-1 bg-ink/10" />
          </div>

          <div className="space-y-6">
            {topIdeas.map((idea, i) => (
              <div key={i} className="group flex flex-col md:flex-row gap-8 p-12 border-2 border-ink bg-white hover:bg-canvas transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-ink group-hover:bg-action transition-colors" />
                <div className="flex-none flex flex-col items-center">
                  <span className="font-heading text-8xl text-ink/5 group-hover:text-action/10 transition-colors leading-none">0{i + 1}</span>
                  {i === 0 && (
                    <div className="mt-[-20px] rotate-[-5deg]">
                      <Badge className="bg-action text-white border-0 text-[10px]">GOLD SIGNAL</Badge>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <Badge variant="outline" className="border-ink/20 uppercase">{idea.category?.replace('_', ' ') || "OPPORTUNITY"}</Badge>
                    {idea.demandScore > 8 && (
                      <Badge variant="outline" className="border-ink/20 bg-insight/5 text-insight border-insight/20">HIGH_DEMAND</Badge>
                    )}
                  </div>
                  <h3 className="text-4xl font-heading mb-6 uppercase leading-none tracking-tight">{idea.title}</h3>
                  <p className="text-ink/70 text-xl max-w-3xl leading-snug mb-10 font-medium">
                    {idea.description}
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 pt-8 border-t border-ink/5">
                    <div>
                      <p className="font-mono text-[10px] text-ink/40 mb-2 uppercase tracking-widest font-bold">Target</p>
                      <p className="font-heading text-lg">{idea.targetAudience || "N/A"}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-ink/40 mb-2 uppercase tracking-widest font-bold">Difficulty</p>
                      <p className={`font-heading text-lg ${idea.technicalComplexity > 7 ? 'text-skip' : 'text-insight'}`}>
                        {idea.technicalComplexity > 7 ? 'High' : idea.technicalComplexity > 4 ? 'Medium' : 'Low'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-ink/40 mb-2 uppercase tracking-widest font-bold">Revenue</p>
                      <p className="font-heading text-lg">{idea.monetizationPotential > 7 ? 'High' : 'Moderate'}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-ink/40 mb-2 uppercase tracking-widest font-bold">Confidence</p>
                      <p className="font-heading text-lg">{idea.demandScore}/10</p>
                    </div>
                  </div>
                </div>
                <div className="flex-none flex items-center justify-center">
                  <Link href={`/build-room/${analysis.id}?idea=${i}`}>
                    <Button size="lg" className="h-20 px-8 text-lg hover:scale-105 active:scale-95 transition-transform">
                      TAG IT & BUILD
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Decision Engine Call-to-action */}
        {!analysis.verdict && (
          <section className="p-16 bg-ink text-canvas relative overflow-hidden border-4 border-action">
            <div className="absolute top-0 right-0 w-96 h-96 bg-action blur-[128px] opacity-30 animate-pulse-slow" />
            <div className="absolute -bottom-24 -left-24 opacity-10 rotate-[-12deg]">
              <Image src="/mascots/scout-milestone.png" alt="" width={400} height={400} />
            </div>
            
            <div className="relative z-10 max-w-3xl">
              <Badge variant="watch" className="mb-10 bg-action text-white border-0 animate-bounce-slow">PAID FEATURE</Badge>
              <h2 className="text-6xl md:text-8xl font-heading mb-10 leading-none tracking-tighter uppercase">
                WHICH ONE SHOULD YOU ACTUALLY BUILD?
              </h2>
              <p className="text-2xl text-canvas/60 mb-16 leading-tight font-medium">
                Our Decision Engine runs 100+ simulations across your founder profile, current market crowdedness, 
                and technical debt to give you a definitive Build/Skip verdict.
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                <Button size="lg" className="bg-action hover:bg-canvas hover:text-ink text-white border-0 h-16 px-10 text-xl font-heading">
                  UNLOCK FULL DECISION
                </Button>
                <Button size="lg" variant="outline" className="border-canvas text-canvas hover:bg-canvas hover:text-ink h-16 px-10 text-xl font-heading">
                  UPGRADE TO BUILDER
                </Button>
              </div>
            </div>
          </section>
        )}

        {analysis.verdict === "BUILD" && analysis.buildRoomId && (
          <section className="p-16 bg-action text-white relative overflow-hidden border-4 border-ink">
            <div className="relative z-10 max-w-3xl">
              <h2 className="text-5xl md:text-7xl font-heading mb-8 leading-none tracking-tighter uppercase">
                THE BUILD ROOM IS READY
              </h2>
              <p className="text-2xl text-white/80 mb-12 leading-tight font-medium">
                Technical blueprints, financial models, and launch assets have been generated for the top signal.
              </p>
              <Link href={`/build-room/${analysis.buildRoomId}`}>
                <Button size="lg" className="bg-ink text-white hover:bg-white hover:text-ink border-0 h-16 px-10 text-xl font-heading uppercase tracking-widest">
                  Enter Build Room
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* Email Capture */}
      <div className="max-w-7xl mx-auto px-6 mt-16">
        <EmailCapture source="report" variant="inline" />
      </div>

      {/* Footer */}
      <footer className="px-6 py-20 border-t-2 border-ink/10 bg-canvas mt-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-3xl font-heading tracking-tighter uppercase">
            SIGNAL SCOUT
          </div>
          <div className="flex gap-12 text-[10px] font-mono text-ink/40 uppercase tracking-[0.3em] font-bold">
            <Link href="/terms" className="hover:text-action transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-action transition-colors">Privacy</Link>
            <Link href="https://x.com/stacksignal" className="hover:text-action transition-colors">X.com</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
