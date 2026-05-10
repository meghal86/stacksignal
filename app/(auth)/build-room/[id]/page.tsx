import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { BuildRoomActions } from "@/components/build/BuildRoomActions";
import { CopyButton } from "@/components/build/CopyButton";

export default async function BuildRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const buildRoom = await prisma.buildRoom.findUnique({
    where: { id },
    include: {
      analysis: {
        include: {
          target: true
        }
      }
    }
  });

  if (!buildRoom || buildRoom.analysis?.userId !== user.id) {
    notFound();
  }

  const analysis = buildRoom.analysis!;
  const target = analysis.target!;
  const financialModel = buildRoom.financialModel as any;

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A1A] selection:bg-[#FF4800] selection:text-white">
      {/* Premium Signal Scout Nav */}
      <nav className="border-b-2 border-[#1A1A1A] px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-50 no-print">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <div className="w-10 h-10 border-2 border-[#1A1A1A] flex items-center justify-center group-hover:bg-[#1A1A1A] group-hover:text-white transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </div>
          </Link>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#FF4800] font-bold tracking-[0.2em] uppercase">Phase: Build</span>
              <div className="w-1 h-1 bg-[#E8E4DD] rounded-full" />
              <span className="font-mono text-[10px] text-[#1A1A1A]/40 font-bold tracking-[0.2em] uppercase">Room #{buildRoom.id.slice(-4)}</span>
            </div>
            <h1 className="font-heading text-2xl uppercase tracking-tighter leading-none mt-1">
              {buildRoom.businessModel || target.displayName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 border border-[#E8E4DD] rounded-full bg-[#F5F0E8]">
            <div className="w-2 h-2 bg-[#FF4800] rounded-full animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Live Signal Feed</span>
          </div>
          <BuildRoomActions />
        </div>
      </nav>
      <div className="h-0.5 w-full bg-[linear-gradient(90deg,#FF4800,#FF9500,#FFCC00,#FF4800,#0090FF,#9B5DE5,#FF4800)] no-print" />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <Tabs defaultValue="decision" className="space-y-12">
          <TabsList className="bg-transparent border-b-2 border-[#1A1A1A] w-full justify-start gap-8 rounded-none h-14 p-0 no-print">
            {[
              { value: "decision", label: "01. Decision" },
              { value: "blueprint", label: "02. Blueprint" },
              { value: "tasks", label: "03. Tasks" },
              { value: "launch", label: "04. Launch" },
              { value: "financials", label: "05. Financials" },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-4 border-transparent data-[state=active]:border-[#FF4800] data-[state=active]:bg-transparent px-0 font-heading uppercase text-sm tracking-widest h-full transition-all hover:text-[#FF4800]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="decision" className="mt-0 outline-none tabs-content">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 space-y-12">
                {/* The Verdict Card */}
                <section className="relative">
                  <div className="absolute -top-6 -left-6 w-24 h-24 z-10 no-print">
                    <Image 
                      src="/ui/sticker-trust.png" 
                      alt="Trust The Signal" 
                      width={96} 
                      height={96}
                      className="rotate-[-12deg] drop-shadow-xl"
                    />
                  </div>
                  
                  <div className="bg-white border-2 border-[#1A1A1A] p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
                      <Image 
                        src="/ui/score-spray-ring.png" 
                        alt="" 
                        width={256} 
                        height={256}
                      />
                    </div>

                    <div className="absolute -bottom-10 -right-4 font-heading text-[120px] uppercase opacity-[0.08] pointer-events-none select-none text-[#FF4800] leading-none">
                      BUILD
                    </div>

                    <div className="flex items-center gap-4 mb-8 relative z-10">
                      <Badge className="bg-[#FF4800] text-white rounded-full px-4 py-1 text-[10px] font-bold tracking-widest uppercase border-none">
                        Positive Signal
                      </Badge>
                      <div className="h-px flex-1 bg-[#E8E4DD]" />
                    </div>

                    <h2 className="text-6xl font-heading uppercase tracking-tighter leading-none mb-8 relative z-10">
                      THE VERDICT: <br />
                      <span className="text-[#FF4800] inline-flex items-center gap-4">
                        BUILD IT
                        <div className="w-12 h-12 relative no-print">
                          <Image src="/icons/verified-signal.svg" alt="" fill className="text-[#FF4800]" />
                        </div>
                      </span>
                    </h2>

                    <div className="space-y-6 max-w-2xl">
                      <p className="text-2xl font-medium leading-tight text-[#1A1A1A]">
                        {analysis.verdictReasoning || "Analyzing market signals for final build verdict..."}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Score Matrix */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const scores = [
                      { label: "Demand", value: analysis.demandScore, icon: "/icons/signal-antenna.svg" },
                      { label: "Founder Fit", value: analysis.founderFitScore, icon: "/icons/scout-visor.svg" },
                      { label: "Crowdedness", value: analysis.crowdednessScore, icon: "/icons/radar-ear.svg" },
                      { label: "Moat", value: analysis.moatScore, icon: "/icons/verified-signal.svg" },
                    ];
                    const maxVal = Math.max(...scores.map(s => s.value || 0));
                    
                    return scores.map((score, i) => (
                      <div key={i} className="p-8 bg-white border-2 border-[#1A1A1A] group hover:bg-[#1A1A1A] transition-colors duration-300 relative overflow-hidden">
                        <div className="w-8 h-8 mb-6 relative group-hover:invert transition-all relative z-10 no-print">
                          <Image src={score.icon} alt="" fill />
                        </div>
                        <p className="font-mono text-[10px] text-[#1A1A1A]/40 group-hover:text-white/40 uppercase font-bold tracking-widest mb-2 relative z-10">{score.label}</p>
                        <p className="text-4xl font-heading group-hover:text-white transition-colors relative z-10">
                          {score.value ? score.value.toFixed(1) : "0.0"}
                        </p>
                      </div>
                    ));
                  })()}
                </section>
              </div>

              {/* Sidebar Stats */}
              <aside className="lg:col-span-4 space-y-8">
                <div className="bg-[#1A1A1A] p-10 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20 pointer-events-none translate-x-4 translate-y-4 no-print">
                    <Image src="/mascots/scout-celebrate.png" alt="" width={128} height={128} />
                  </div>
                  
                  <h3 className="font-heading text-white/40 text-xs uppercase tracking-[0.2em] mb-6">Confidence Level</h3>
                  <div className="flex items-baseline gap-2">
                    <p className="text-9xl font-heading leading-none text-[#FF4800] tracking-tighter">
                      {analysis.confidence || 0}
                    </p>
                    <p className="text-2xl font-heading text-white/20 uppercase">/ 10</p>
                  </div>
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <p className="font-mono text-[10px] text-white/60 uppercase leading-relaxed">
                      Scout has processed <span className="text-white font-bold">14+ signals</span> across GitHub, Reddit, and X to reach this conclusion.
                    </p>
                  </div>
                </div>

                <div className="bg-white border-2 border-[#1A1A1A] p-8 relative">
                  <div className="absolute -top-4 -right-4 w-16 h-16 no-print">
                    <Image src="/ui/sticker-scout.png" alt="Signal Scout" width={64} height={64} className="rotate-12" />
                  </div>
                  <h3 className="font-heading text-xs uppercase tracking-widest mb-6 pb-4 border-b border-[#E8E4DD]">Signal Context</h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <span className="font-mono text-[10px] text-[#1A1A1A]/40 uppercase font-bold">Source</span>
                      <span className="font-heading uppercase text-sm">{target.type}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-mono text-[10px] text-[#1A1A1A]/40 uppercase font-bold">Identifier</span>
                      <span className="font-mono text-xs font-bold text-[#FF4800]">{target.identifier}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-mono text-[10px] text-[#1A1A1A]/40 uppercase font-bold">Scan Time</span>
                      <span className="font-mono text-[10px] font-bold">{new Date(analysis.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="blueprint" className="mt-0 outline-none tabs-content">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-7 space-y-12">
                <section className="bg-white border-2 border-[#1A1A1A] p-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
                    <Image src="/ui/sticker-noise.png" alt="" width={128} height={128} />
                  </div>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-heading text-2xl uppercase tracking-tighter">Technical Blueprint</h3>
                    <CopyButton content={buildRoom.productSpec || ""} label="Copy Spec" />
                  </div>
                  <div className="prose prose-zinc max-w-none prose-headings:font-heading prose-headings:uppercase prose-p:text-lg prose-p:leading-relaxed text-[#1A1A1A]/80 whitespace-pre-wrap">
                    {buildRoom.productSpec || "Generating technical architecture and product roadmap..."}
                  </div>
                </section>
                
                <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="font-heading text-xl uppercase tracking-widest whitespace-nowrap">The Stack</h3>
                    <div className="h-px w-full bg-[#E8E4DD]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(buildRoom.stackRecs as any[])?.map((rec, i) => (
                      <div key={i} className="p-6 bg-white border-2 border-[#1A1A1A] group hover:bg-[#FF4800] transition-colors">
                        <p className="font-mono text-[10px] text-[#FF4800] group-hover:text-white/80 mb-2 font-bold uppercase tracking-widest">{rec.category}</p>
                        <p className="font-heading text-xl uppercase group-hover:text-white">{rec.tool}</p>
                      </div>
                    )) || (
                      <div className="col-span-2 p-12 bg-white border-2 border-[#E8E4DD] border-dashed text-center">
                        <p className="font-mono text-[10px] text-[#1A1A1A]/40 uppercase">Generating recommended technologies...</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <aside className="lg:col-span-5 space-y-8">
                <div className="bg-[#1A1A1A] p-10 relative overflow-hidden">
                  <div className="absolute top-4 right-4 w-12 h-12 no-print">
                    <Image src="/icons/signal-boost.svg" alt="" width={48} height={48} className="invert" />
                  </div>
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="font-heading text-xl uppercase tracking-tighter text-[#FF4800]">Core Schema</h3>
                    <CopyButton 
                      content={buildRoom.prismaSchema || ""} 
                      label="Copy Schema" 
                      className="border-white/20 text-white hover:bg-white hover:text-[#1A1A1A]"
                    />
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-[#FF4800]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <pre className="font-mono text-[11px] overflow-x-auto p-6 bg-white/5 text-white/70 leading-relaxed border border-white/10 max-h-[600px] scrollbar-thin scrollbar-thumb-white/10">
                      {buildRoom.prismaSchema || "// Database schema is being computed based on signals..."}
                    </pre>
                  </div>
                </div>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-0 outline-none tabs-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section className="space-y-8">
                <div className="flex items-center gap-4 border-b-2 border-[#1A1A1A] pb-4">
                  <div className="w-12 h-12 bg-[#FF4800] flex items-center justify-center border-2 border-[#1A1A1A]">
                    <Image src="/icons/scout-visor.svg" alt="" width={24} height={24} className="invert" />
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl uppercase tracking-tighter">AI Agent Pipeline</h3>
                    <p className="font-mono text-[10px] text-[#FF4800] font-bold uppercase tracking-widest">Automation Ready</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {(buildRoom.agentTasks as any[])?.map((task, i) => (
                    <div key={i} className="flex gap-6 p-8 bg-white border-2 border-[#1A1A1A] group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#FF4800]" />
                      <div className="w-6 h-6 border-2 border-[#1A1A1A] mt-1 shrink-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#FF4800] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-heading text-lg uppercase tracking-tight">{task.title}</p>
                          <CopyButton content={`${task.title}: ${task.description}`} className="opacity-0 group-hover:opacity-100 no-print" />
                        </div>
                        <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">{task.description}</p>
                      </div>
                    </div>
                  )) || (
                    <div className="p-12 border-2 border-[#E8E4DD] border-dashed text-center">
                      <p className="font-mono text-[10px] text-[#1A1A1A]/40 uppercase tracking-widest">Generating automation roadmap...</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-8">
                <div className="flex items-center gap-4 border-b-2 border-[#1A1A1A] pb-4">
                  <div className="w-12 h-12 bg-[#1A1A1A] flex items-center justify-center">
                    <Image src="/icons/tag-it.svg" alt="" width={24} height={24} className="invert" />
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl uppercase tracking-tighter">Founder Manual</h3>
                    <p className="font-mono text-[10px] text-[#1A1A1A]/40 font-bold uppercase tracking-widest">High Intensity</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {(buildRoom.founderTasks as any[])?.map((task, i) => (
                    <div key={i} className="flex gap-6 p-8 bg-white border-2 border-[#1A1A1A] group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#1A1A1A]" />
                      <div className="w-6 h-6 border-2 border-[#1A1A1A] mt-1 shrink-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-heading text-lg uppercase tracking-tight">{task.title}</p>
                          <CopyButton content={`${task.title}: ${task.description}`} className="opacity-0 group-hover:opacity-100 no-print" />
                        </div>
                        <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">{task.description}</p>
                      </div>
                    </div>
                  )) || (
                    <div className="p-12 border-2 border-[#E8E4DD] border-dashed text-center">
                      <p className="font-mono text-[10px] text-[#1A1A1A]/40 uppercase tracking-widest">Compiling founder directives...</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="launch" className="mt-0 outline-none tabs-content">
            <div className="max-w-4xl mx-auto space-y-12">
              <section className="relative p-16 bg-white border-4 border-[#1A1A1A] space-y-10 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 opacity-10 rotate-12 pointer-events-none z-0 no-print">
                  <Image src="/ui/sticker-noise.png" alt="" width={160} height={160} />
                </div>
                
                <div className="absolute -bottom-10 -left-10 w-48 h-48 opacity-20 pointer-events-none z-0 no-print">
                  <Image src="/mascots/scout-milestone.png" alt="" width={192} height={192} />
                </div>
                
                <div className="space-y-6 relative">
                  <p className="font-mono text-xs text-[#FF4800] font-bold uppercase tracking-[0.3em]">Phase 04: Market Entry</p>
                  <h3 className="text-6xl font-heading leading-[0.9] uppercase tracking-tighter max-w-2xl">
                    {(buildRoom.landingCopy as any)?.heroTitle || "Awaiting high-velocity marketing copy..."}
                  </h3>
                  <p className="text-xl text-[#1A1A1A]/60 leading-relaxed max-w-xl">
                    {(buildRoom.landingCopy as any)?.heroSubtitle || "Scout is currently drafting your competitive advantage."}
                  </p>
                </div>
                
                <Button className="w-full h-20 text-xl uppercase tracking-[0.2em] font-heading bg-[#FF4800] hover:bg-[#1A1A1A] text-white transition-all rounded-none border-b-8 border-[#1A1A1A]/20 no-print">
                  Deploy MVP To Production
                </Button>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(buildRoom.launchPosts as any[])?.map((post, i) => (
                  <div key={i} className="p-10 border-2 border-[#1A1A1A] bg-white group hover:shadow-[8px_8px_0px_0px_rgba(10,10,8,1)] transition-all">
                    <div className="flex justify-between items-center mb-8">
                      <p className="font-mono text-[10px] text-[#1A1A1A]/40 font-bold uppercase tracking-widest">{post.platform}</p>
                      <div className="w-2 h-2 rounded-full bg-[#FF4800]" />
                    </div>
                    <p className="text-sm leading-relaxed italic mb-8 font-medium">"{post.content}"</p>
                    <CopyButton content={post.content} label={`Copy to ${post.platform}`} className="w-full h-12 no-print" />
                  </div>
                ))}
              </section>
            </div>
          </TabsContent>

          <TabsContent value="financials" className="mt-0 outline-none tabs-content">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 p-12 bg-white border-2 border-[#1A1A1A] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none translate-x-1/2 -translate-y-1/2">
                  <Image src="/ui/score-spray-ring.png" alt="" width={256} height={256} />
                </div>

                <h3 className="font-heading text-3xl mb-12 uppercase tracking-tighter">Pro Forma Projection</h3>
                
                {/* Enhanced Chart Container */}
                <div className="h-96 flex items-end gap-3 bg-[#F5F0E8] border-2 border-[#1A1A1A] p-8 pb-12 relative group/chart">
                  {/* Y-Axis Labels */}
                  <div className="absolute left-2 top-0 bottom-12 flex flex-col justify-between font-mono text-[8px] text-[#1A1A1A]/30 py-4 pointer-events-none">
                    <span>$2.5k</span>
                    <span>$2.0k</span>
                    <span>$1.5k</span>
                    <span>$1.0k</span>
                    <span>$0.5k</span>
                    <span>$0</span>
                  </div>

                  {/* Grid Lines */}
                  <div className="absolute inset-x-0 top-[20%] border-t border-[#1A1A1A]/5 border-dashed w-full" />
                  <div className="absolute inset-x-0 top-[40%] border-t border-[#1A1A1A]/5 border-dashed w-full" />
                  <div className="absolute inset-x-0 top-[60%] border-t border-[#1A1A1A]/5 border-dashed w-full" />
                  <div className="absolute inset-x-0 top-[80%] border-t border-[#1A1A1A]/5 border-dashed w-full" />
                  
                  {/* Bars with Cumulative Line Overlay logic */}
                  {(() => {
                    const projections = financialModel?.projections || [400, 650, 900, 1200, 1600, 2200];
                    const maxVal = Math.max(...projections, 2500);
                    const burn = financialModel?.burn || 500;
                    
                    return projections.map((val: number, i: number) => {
                      const heightPercent = (val / maxVal) * 100;
                      const burnPercent = (burn / maxVal) * 100;
                      const isProfitable = val > burn;
                      
                      return (
                        <div key={i} className="flex-1 flex flex-col justify-end gap-2 group relative h-full">
                          {/* Revenue Bar */}
                          <div 
                            className={`transition-all duration-500 w-full relative z-10 ${isProfitable ? "bg-[#FF4800]" : "bg-[#1A1A1A]/20"}`}
                            style={{ height: `${heightPercent}%` }}
                          >
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all font-mono text-[10px] bg-[#1A1A1A] text-white px-3 py-1.5 font-bold whitespace-nowrap z-20 shadow-xl no-print">
                              +${val.toLocaleString()} REV
                            </div>
                          </div>

                          {/* Target Line (Burn) Overlay */}
                          <div 
                            className="absolute left-0 right-0 border-t-2 border-[#1A1A1A]/10 border-dotted pointer-events-none z-0"
                            style={{ bottom: `${burnPercent}%` }}
                          />

                          <p className="text-[10px] font-mono font-bold text-[#1A1A1A]/40 text-center uppercase tracking-tighter absolute -bottom-8 left-0 right-0">Month {i+1}</p>
                        </div>
                      );
                    });
                  })()}

                  <div className="absolute top-6 right-8 flex flex-col gap-3 font-mono text-[10px] font-bold uppercase tracking-widest bg-white p-4 border border-[#E8E4DD] no-print">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#FF4800]" /> Profitable Rev</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#1A1A1A]/20" /> Initial Growth</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 border-t-2 border-[#1A1A1A]/40 border-dotted" /> Monthly Burn</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-20 pt-12 border-t-2 border-[#F5F0E8]">
                   <div className="space-y-3">
                     <p className="font-mono text-[10px] text-[#1A1A1A]/40 font-bold uppercase tracking-[0.2em]">Monthly Burn</p>
                     <p className="text-5xl font-heading text-[#FF4800] tracking-tighter leading-none">${financialModel?.burn || 0}</p>
                   </div>
                   <div className="space-y-3">
                     <p className="font-mono text-[10px] text-[#1A1A1A]/40 font-bold uppercase tracking-[0.2em]">Target MRR</p>
                     <p className="text-5xl font-heading text-[#1A1A1A] tracking-tighter leading-none">${financialModel?.targetMrr || 0}</p>
                   </div>
                   <div className="space-y-3">
                     <p className="font-mono text-[10px] text-[#1A1A1A]/40 font-bold uppercase tracking-[0.2em]">Break Even</p>
                     <p className="text-5xl font-heading text-[#1A1A1A] tracking-tighter leading-none">{financialModel?.breakevenMonths || 0}<span className="text-xl ml-1 text-[#1A1A1A]/20">MO</span></p>
                   </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                <div className="p-10 bg-[#F5F0E8] border-2 border-[#1A1A1A] space-y-8 relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-20 h-20 opacity-10 pointer-events-none no-print">
                    <Image src="/ui/sticker-scout.png" alt="" width={80} height={80} />
                  </div>
                  
                  <div>
                    <h3 className="font-heading text-xs uppercase tracking-widest text-[#0A0A08]/40 mb-4 font-bold">Monetization</h3>
                    <p className="text-3xl font-heading uppercase leading-none tracking-tighter">{buildRoom.businessModel || "Subscription SaaS"}</p>
                  </div>

                  <div className="space-y-4 pt-8 border-t border-[#E8E4DD]">
                    <p className="font-mono text-[10px] text-[#0A0A08]/40 font-bold uppercase tracking-widest mb-6">Revenue Streams</p>
                    {financialModel?.revenueStreams?.map((stream: string, i: number) => (
                      <div key={i} className="flex items-center gap-4 group cursor-default">
                        <div className="w-2 h-2 bg-[#FF3E00] group-hover:scale-150 transition-transform" />
                        <span className="font-heading text-sm uppercase tracking-tight group-hover:text-[#FF3E00] transition-colors">{stream}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div 
                  className="bg-[#0A0A08] p-8 relative group cursor-pointer overflow-hidden no-print"
                  onClick={() => window.print()}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF3E00] to-[#FF3E00]/0 opacity-0 group-hover:opacity-10 transition-opacity" />
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-white font-heading uppercase text-xs tracking-widest">Download Full Report</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#FF3E00]">
                      <path d="M7 17l9.2-9.2M17 17V7H7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Signature Footer */}
        <footer className="mt-24 pt-8 border-t border-[#E8E4DD] flex justify-between items-end no-print">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-[#FF3E00] rounded-full" />
              <div className="w-2 h-2 bg-[#00C94A] rounded-full" />
              <div className="w-2 h-2 bg-[#00B8A0] rounded-full" />
            </div>
            <p className="font-mono text-[10px] text-[#0A0A08]/40 uppercase font-bold tracking-[0.2em]">
              Data processed via Signal Scout Protocol v4.0.2
            </p>
          </div>
          <div className="font-heading text-4xl opacity-[0.06] select-none pointer-events-none uppercase tracking-tighter">
            STACKSIGNAL 2026
          </div>
        </footer>
      </main>
    </div>
  );
}
