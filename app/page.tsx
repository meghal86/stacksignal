import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AnalysisInput } from "@/components/analysis/AnalysisInput";
import { EmailCapture } from "@/components/marketing/EmailCapture";
import { Navbar } from "@/components/layout/Navbar";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";

export default async function Home() {
  const latestAnalyses = await prisma.analysis.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: {
      target: true,
    },
  });
  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-action selection:text-white relative overflow-hidden">
      {/* Background Graffiti Layer */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.03]">
        <div className="absolute top-[10%] left-[-5%] text-[20vw] font-heading rotate-[-12deg] uppercase">SIGNAL</div>
        <div className="absolute bottom-[20%] right-[-10%] text-[15vw] font-heading rotate-[8deg] uppercase text-action">SCOUT</div>
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="px-6 pt-24 pb-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative">
        <div className="flex-1 text-center lg:text-left z-10">
          <div className="flex flex-col lg:flex-row items-center lg:items-end gap-4 mb-8">
            <Badge variant="watch" className="px-6 py-2 text-xs border-2 border-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              EST. 2026
            </Badge>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/40 font-bold">Ecosystem Intelligence v1.0</p>
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-heading leading-[0.85] mb-10 uppercase tracking-tighter">
            FIND THE<br />
            <span className="relative inline-block">
              RIGHT
              <span className="absolute -bottom-2 left-0 w-full h-4 bg-action/20 -rotate-2 -z-10" />
            </span> 
            <span className="text-action block">SIGNAL</span>
          </h1>

          <p className="max-w-2xl text-lg md:text-xl mb-12 text-ink/70 leading-relaxed font-medium">
            We track GitHub velocity, NPM volatility, and HN hype to tell you which business idea is worth building. 
            <span className="text-ink font-bold"> Don't build noise. Build signals.</span>
          </p>

          <div className="relative max-w-xl mx-auto lg:mx-0">
            <AnalysisInput />
            {/* Mascot Overlay */}
            <div className="absolute -right-16 -top-16 w-32 h-32 hidden md:block animate-bounce-slow">
              <Image src="/mascots/scout-search.png" alt="" width={128} height={128} className="object-contain" />
            </div>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-6 text-[10px] font-mono text-ink/40 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-action" /> TRENDING: DRIZZLE ORM
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-insight" /> TAVILY AI
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-clarity" /> SHADCN UI
            </span>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-2xl">
          <div className="relative z-20 group">
            <Image 
              src="/mascots/scout-default.png" 
              alt="Signal Scout" 
              width={600}
              height={600}
              className="w-full h-auto drop-shadow-2xl grayscale hover:grayscale-0 transition-all duration-700 cursor-crosshair"
            />
            {/* Spray Ring Animation */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-[120%] h-[120%] opacity-20 animate-spin-slow">
                <circle cx="100" cy="100" r="80" fill="none" stroke="var(--color-signal)" strokeWidth="0.5" strokeDasharray="1 4" />
                <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-insight)" strokeWidth="0.5" strokeDasharray="2 6" />
              </svg>
            </div>
          </div>
          
          {/* Stickers */}
          <div className="absolute -top-4 -left-4 z-30 w-32 h-32 rotate-[-12deg] animate-float">
            <Image src="/ui/sticker-scout.png" alt="" width={128} height={128} className="object-contain" />
          </div>
          <div className="absolute -bottom-8 -right-8 z-30 w-40 h-40 rotate-[12deg] animate-float-delayed">
            <Image src="/ui/sticker-trust.png" alt="" width={160} height={160} className="object-contain" />
          </div>
        </div>
      </section>

      {/* Live Signals Section */}
      <section className="px-6 py-32 bg-ink text-canvas relative overflow-hidden">
        {/* Graffiti Tag */}
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <h2 className="text-[12vw] font-heading leading-none uppercase rotate-90 origin-top-right">LIVE</h2>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.4em] text-canvas/40 mb-4 font-bold">Ecosystem Pulse</p>
              <h2 className="text-5xl md:text-7xl font-heading uppercase tracking-tighter">RECENT SIGNALS</h2>
            </div>
            <Link href="/leaderboard">
              <Button variant="outline" className="h-16 px-10 border-canvas/20 text-canvas hover:bg-canvas hover:text-ink transition-all font-heading uppercase">
                View Full Spectrum
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-canvas/10">
            {latestAnalyses.map((item, i) => (
              <Link key={i} href={`/report/${item.slug}`} className="p-10 border border-canvas/10 hover:bg-canvas/5 transition-all group relative">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <p className="font-mono text-[10px] text-canvas/30 mb-1 uppercase tracking-widest font-bold">{item.target?.type || "TARGET"}</p>
                    <h3 className="text-3xl font-heading uppercase group-hover:text-action transition-colors truncate max-w-[200px]">
                      {item.target?.displayName || item.rawInput}
                    </h3>
                  </div>
                  <Badge variant={(item.verdict?.toLowerCase() as any) || "watch"} className="px-4 py-1 border-0">
                    {item.verdict || "WATCH"}
                  </Badge>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-mono text-[10px] text-canvas/30 mb-2 uppercase tracking-widest font-bold">Composite Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-heading">{item.confidence ?? item.target?.signalScore ?? 0}</span>
                      <span className="text-xs font-mono text-canvas/20">/ 10</span>
                    </div>
                  </div>
                  <div className="w-12 h-1 bg-canvas/10 group-hover:bg-action transition-all group-hover:w-20" />
                </div>

                {/* Card Background Graffiti */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none flex items-center justify-center p-4">
                  <span className="text-7xl font-heading uppercase -rotate-12">{item.verdict || "WATCH"}</span>
                </div>
              </Link>
            ))}
            {latestAnalyses.length === 0 && (
              <div className="col-span-full p-20 text-center border border-canvas/10">
                <p className="font-heading text-2xl uppercase opacity-20 tracking-widest italic">Waiting for the first signals...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Email Capture Section */}
      <EmailCapture source="homepage" variant="banner" />

      {/* Footer */}
      <footer className="px-6 py-20 bg-canvas relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
          <div>
            <h2 className="text-2xl font-heading tracking-tighter mb-4 uppercase">STACKSIGNAL</h2>
            <p className="text-xs font-mono text-ink/40 max-w-xs leading-loose uppercase font-bold tracking-tight">
              A business intelligence engine for the next generation of founders. 
              Validated signals. Verified decisions.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16 md:gap-24">
            <div className="space-y-4">
              <p className="font-mono text-[10px] text-ink/20 uppercase tracking-widest font-bold">Platform</p>
              <ul className="space-y-2 font-heading text-sm uppercase">
                <li><Link href="/leaderboard" className="hover:text-action transition-colors">Leaderboard</Link></li>
                <li><Link href="/pricing" className="hover:text-action transition-colors">Pricing</Link></li>
                <li><Link href="/analyze" className="hover:text-action transition-colors">Scan</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="font-mono text-[10px] text-ink/20 uppercase tracking-widest font-bold">Legal</p>
              <ul className="space-y-2 font-heading text-sm uppercase">
                <li><Link href="/terms" className="hover:text-action transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-action transition-colors">Privacy</Link></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <EmailCapture source="footer" variant="footer" />
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-20 pt-12 border-t-2 border-ink/5 flex flex-col md:flex-row justify-between gap-12 items-center opacity-40 group/footer">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em]">© 2026 STACKSIGNAL ENGINE</p>
            <div className="flex items-center gap-4">
              <div className="h-[1px] w-8 bg-ink" />
              <p className="text-[8px] font-mono uppercase tracking-widest">Public Access Nodes</p>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-2xl font-heading uppercase tracking-tighter italic group-hover/footer:text-action transition-colors">STACKSIGNAL 2026</p>
            <p className="text-[10px] font-mono uppercase tracking-widest font-bold">Signal Scout / Distributed Network</p>
          </div>
        </div>
      </footer>

      {/* Final Spectrum Bar */}
      <div className="h-2 w-full bg-spectrum" />
    </div>
  );
}
