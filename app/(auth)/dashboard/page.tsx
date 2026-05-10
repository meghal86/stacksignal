import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
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

  // Ensure user exists in Prisma
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { target: true }
      },
      savedReports: true,
    },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        creditsBalance: 3,
      },
      include: {
        analyses: {
          include: { target: true },
        },
        savedReports: true,
      },
    });
  }

  if (!dbUser) {
    redirect("/");
  }

  const resolvedUser = dbUser;

  // Fetch active build rooms
  const buildRooms = await prisma.buildRoom.findMany({
    where: {
      analysis: {
        userId: user.id
      }
    },
    include: {
      analysis: true
    }
  });

  return (
    <div className="min-h-screen bg-canvas text-ink relative overflow-hidden">
      {/* Background Graffiti */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.02]">
        <div className="absolute top-[15%] right-[-5%] text-[15vw] font-heading rotate-12 uppercase">DASHBOARD</div>
        <div className="absolute bottom-[10%] left-[-2%] text-[10vw] font-heading -rotate-6 uppercase text-action">COMMAND</div>
      </div>

      <Navbar user={resolvedUser} />

      <main className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-24 pb-16 border-b-4 border-ink relative">
          <div className="relative">
            <Badge variant="watch" className="mb-6 px-4 py-1 text-[10px] border-2 border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              ACTIVE SESSION
            </Badge>
            <h1 className="text-7xl md:text-9xl font-heading mb-4 uppercase tracking-tighter leading-[0.8] relative">
              COMMAND<br />CENTER
              {/* Mascot Overlay */}
              <div className="absolute -top-12 -right-12 w-24 h-24 rotate-12 animate-float">
                <Image src="/mascots/scout-processing.png" alt="" width={96} height={96} />
              </div>
            </h1>
            <p className="text-xl text-ink/60 font-medium max-w-md">Ecosystem intelligence management for high-velocity builders.</p>
          </div>
          
          <div className="flex flex-col items-end gap-4 p-8 bg-white border-2 border-ink shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative group/credits">
            <div className="absolute -top-6 -left-6 w-16 h-16 rotate-[-15deg] group-hover/credits:rotate-0 transition-transform duration-500">
               <Image src="/mascots/scout-search.png" alt="" width={64} height={64} className="drop-shadow-md" />
            </div>
            <p className="font-mono text-[10px] text-ink/40 uppercase tracking-[0.2em] font-bold">Signal Credits</p>
            <div className="flex items-center gap-6">
              <p className="text-7xl font-heading text-action leading-none">{resolvedUser.creditsBalance}</p>
              {resolvedUser.creditsBalance < 5 && (
                <Link href="/pricing">
                  <Button size="sm" variant="outline" className="border-2 border-action text-action text-[10px] uppercase tracking-widest font-bold hover:bg-action hover:text-white transition-all">
                    Top Up
                  </Button>
                </Link>
              )}
            </div>
            {resolvedUser.creditsBalance < 5 && (
              <p className="text-[10px] text-action font-bold uppercase tracking-tight animate-pulse">Low balance — replenish to unlock deep scans</p>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
          {/* Recent Analyses */}
          <div className="lg:col-span-2 space-y-12">
            <div className="flex items-center gap-6">
              <h2 className="text-4xl font-heading uppercase tracking-tighter italic">Recent Signals</h2>
              <div className="flex-1 h-0.5 bg-ink/5" />
            </div>
            
            <div className="space-y-6">
              {resolvedUser.analyses.length === 0 ? (
                <div className="p-24 border-2 border-dashed border-ink/10 text-center bg-white/30 backdrop-blur-sm flex flex-col items-center">
                  <div className="mb-8 opacity-10 grayscale">
                    <Image src="/mascots/scout-empty.png" alt="" width={120} height={120} />
                  </div>
                  <p className="font-mono text-xs text-ink/40 uppercase tracking-[0.3em] font-bold">No signals tracked in this sector</p>
                  <Link href="/" className="mt-8">
                    <Button variant="outline" className="font-heading uppercase">Initiate First Scan</Button>
                  </Link>
                </div>
              ) : (
                resolvedUser.analyses.map((report, i) => (
                  <Link key={i} href={`/report/${report.slug}`} className="flex flex-col md:flex-row md:items-center justify-between p-8 border-2 border-ink bg-white hover:bg-canvas hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(251,146,60,1)] transition-all group relative overflow-hidden">
                    <div className="flex items-center gap-8 relative z-10">
                      <div className="w-20 h-20 bg-canvas border-2 border-ink flex items-center justify-center font-heading text-3xl group-hover:bg-action group-hover:text-white group-hover:border-action transition-all rounded-none">
                        {report.target?.displayName?.[0].toUpperCase() || "?"}
                      </div>
                      <div>
                        <h3 className="font-heading text-3xl uppercase leading-none mb-3 group-hover:text-action transition-colors">{report.target?.displayName || "Research"}</h3>
                        <div className="flex items-center gap-4">
                          <p className="font-mono text-[10px] text-ink/40 font-bold uppercase tracking-widest">
                            {report.target?.type || "GENERIC"} • {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-16 mt-8 md:mt-0 relative z-10">
                      <div className="text-right">
                        <p className="font-mono text-[10px] text-ink/40 uppercase mb-2 tracking-widest font-bold">Verdict</p>
                        <p className={`font-heading text-3xl ${
                          report.verdict === 'BUILD' ? 'text-action' : 
                          report.verdict === 'SKIP' ? 'text-ink' : 
                          'text-insight'
                        }`}>{report.verdict || "PENDING"}</p>
                      </div>
                      <div className="w-32 flex justify-end">
                        {report.verdict && (
                          <Badge 
                            variant={report.verdict.toLowerCase() as any}
                            className="px-8 py-2 border-2 border-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs"
                          >
                            {report.verdict}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Ghost Text */}
                    <div className="absolute -bottom-4 -right-4 text-9xl font-heading opacity-[0.02] group-hover:opacity-[0.05] transition-opacity uppercase pointer-events-none select-none">
                      {report.verdict}
                    </div>
                  </Link>
                ))
              )}
            </div>
            
            <Link href="/" className="block">
              <Button variant="outline" className="w-full h-24 border-2 border-dashed border-ink/20 font-mono text-sm uppercase tracking-[0.2em] font-bold text-ink/30 hover:text-action hover:border-action hover:bg-white transition-all group">
                <span className="group-hover:scale-110 transition-transform inline-block">+ INITIATE NEW SCAN</span>
              </Button>
            </Link>
          </div>

          {/* Sidebar / Build Rooms */}
          <div className="space-y-20">
            <div className="space-y-12">
              <div className="flex items-center gap-6">
                <h2 className="text-4xl font-heading uppercase tracking-tighter italic">Build Rooms</h2>
                <div className="flex-1 h-0.5 bg-ink/5" />
              </div>
              
              <div className="space-y-6">
                {buildRooms.length === 0 ? (
                  <div className="p-16 border-2 border-dashed border-ink/10 text-center bg-white/30 backdrop-blur-sm">
                    <p className="font-mono text-[10px] text-ink/40 uppercase tracking-[0.2em] font-bold">No workspaces active</p>
                  </div>
                ) : (
                  buildRooms.map((room, i) => (
                    <Link key={i} href={`/build-room/${room.id}`} className="block p-10 border-2 border-ink bg-white hover:bg-canvas hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden">
                      <div className="flex justify-between items-start mb-8 relative z-10">
                        <h3 className="font-heading text-2xl uppercase leading-none group-hover:text-action transition-colors">{room.businessModel || "Untitled MVP"}</h3>
                        <Badge className="bg-ink text-canvas border-0 text-[10px] px-4">ACTIVE</Badge>
                      </div>
                      <div className="h-4 w-full bg-canvas border-2 border-ink overflow-hidden relative z-10">
                        <div className="h-full bg-action" style={{ width: `35%` }} />
                      </div>
                      <p className="mt-4 font-mono text-[10px] text-ink/40 uppercase font-bold text-right relative z-10">Progress: 35% Verified</p>
                      
                      {/* Decoration */}
                      <div className="absolute -bottom-4 -left-4 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Image src="/ui/sticker-noise.png" alt="" width={80} height={80} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Upgrade Card */}
            <div className="p-12 bg-action text-white relative overflow-hidden border-4 border-ink shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] group">
              <div className="absolute -top-10 -right-10 opacity-20 group-hover:rotate-12 transition-transform duration-500">
                <Image src="/mascots/scout-celebrate.png" alt="" width={200} height={200} />
              </div>
              <div className="relative z-10">
                <h2 className="text-4xl font-heading mb-6 uppercase leading-[0.9] tracking-tighter">Unlimited Scans. Deep Decisions.</h2>
                <p className="text-sm text-white/80 mb-10 font-mono uppercase tracking-tight font-bold leading-relaxed">Upgrade to Pro for 100 monthly analyses and priority Scout indexing.</p>
                <Link href="/pricing">
                  <Button className="w-full h-16 bg-white text-ink hover:bg-ink hover:text-white border-0 text-md font-heading uppercase transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                    GO PRO
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Signature */}
      <footer className="max-w-7xl mx-auto px-6 py-20 mt-12 border-t-2 border-ink/5 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 group/footer">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em]">© 2026 STACKSIGNAL ENGINE</p>
          <div className="flex items-center gap-4">
            <div className="h-[1px] w-8 bg-ink" />
            <p className="text-[8px] font-mono uppercase tracking-widest">Core Intelligence: v1.0.42</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-heading uppercase tracking-tighter italic group-hover/footer:text-action transition-colors">STACKSIGNAL 2026</p>
          <p className="text-[10px] font-mono uppercase tracking-widest font-bold">Signal Scout / Verified System</p>
        </div>
      </footer>
    </div>
  );
}
