import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import { SignalArtwork } from "@/components/brand/SignalArtwork";

export const metadata = {
  title: "Build Room — StackSignal",
  description: "Open Build Room workspaces for BUILD verdicts.",
};

export default async function BuildRoomIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/build-room");

  const buildRooms = await prisma.buildRoom.findMany({
    where: {
      analysis: {
        userId: user.id,
        verdict: "BUILD",
      },
    },
    include: {
      analysis: {
        include: {
          target: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  return (
    <main className="art-page text-ink">
      <div className="art-shell mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside>
          <SignalArtwork label="Build Room gate" compact />
          <div className="mt-4 border border-ink bg-ink p-6 text-canvas">
            <p className="font-heading text-4xl uppercase leading-none tracking-[-0.06em]">
              Build Room opens only after a BUILD verdict.
            </p>
            <p className="mt-4 text-sm leading-6 text-canvas/60">
              This keeps the workspace focused. No blueprint, launch plan, or financial model is generated until the signal says the opportunity is worth building.
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="ink-card p-6 sm:p-8">
            <p className="kicker">Founder workspace</p>
            <h1 className="mt-3 display-title text-6xl uppercase sm:text-8xl">
              Build Rooms.
              <span className="block text-action">Only for BUILD calls.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-ink/62">
              Open an existing workspace below, or run a paid verdict on an analysis and use the Build Room CTA when the result is BUILD.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="border border-ink bg-ink px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-canvas"
              >
                View dashboard
              </Link>
              <Link
                href="/analyze?tier=paid"
                className="border border-ink bg-action px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white"
              >
                Run paid analysis →
              </Link>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {buildRooms.length > 0 ? (
              buildRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/build-room/${room.analysis?.id ?? room.id}`}
                  className="group grid gap-4 border border-ink/15 bg-white/65 p-5 transition-colors hover:border-ink hover:bg-white sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-heading text-2xl uppercase tracking-[-0.05em] group-hover:text-action">
                      {room.businessModel || room.analysis?.target?.displayName || "Untitled Build Room"}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/42">
                      {room.analysis?.rawInput || "BUILD verdict workspace"}
                    </p>
                  </div>
                  <div className="self-center font-mono text-xs font-bold uppercase tracking-[0.16em] text-action">
                    Open →
                  </div>
                </Link>
              ))
            ) : (
              <div className="border border-dashed border-ink/25 bg-white/45 p-8 text-center">
                <p className="font-heading text-3xl uppercase tracking-[-0.06em]">No Build Rooms yet</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink/55">
                  Get a BUILD verdict first. If the result is SKIP or WATCH, StackSignal intentionally keeps the Build Room locked.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
