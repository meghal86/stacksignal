import { Suspense } from "react";
import Link from "next/link";
import { AnalysisInput } from "@/components/analysis/AnalysisInput";
import { EmailCapture } from "@/components/marketing/EmailCapture";
import { SignalArtwork, SignalMarquee } from "@/components/brand/SignalArtwork";
import { SignalNav } from "@/components/brand/SignalNav";
import {
  LeaderboardSection,
  LeaderboardSkeleton,
  type LeaderboardEntry,
} from "@/components/home/LeaderboardSection";

export const dynamic = "force-dynamic";

type LeaderboardResponse = {
  entries?: LeaderboardEntry[];
  date?: string;
};

async function getLeaderboard(): Promise<LeaderboardResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/leaderboard`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return { entries: [], date: new Date().toISOString().split("T")[0] };
    return (await response.json()) as LeaderboardResponse;
  } catch {
    return { entries: [], date: new Date().toISOString().split("T")[0] };
  }
}

const tryRepos = ["temporalio/temporal", "n8n-io/n8n", "directus/directus"];

export default async function HomePage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="art-page text-ink">
      <SignalNav />
      <div className="art-shell">
        <HeroSection />
        <SignalMarquee />
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardSection data={leaderboard} />
        </Suspense>
        <HowItWorksSection />
        <EmailCaptureSection />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-78px)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
      <div className="relative">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="kicker">Today&apos;s ecosystem radar</span>
          <span className="rounded-pill bg-clarity px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
            No input required
          </span>
        </div>

        <h1 className="display-title max-w-5xl text-[17vw] uppercase sm:text-[96px] lg:text-[116px]">
          Know what to build.
          <span className="block text-action">Skip the wrong work.</span>
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-8 text-ink/64 sm:text-xl">
          StackSignal turns ecosystem signals into one clear Build / Skip / Watch decision,
          ranked business ideas, and a founder-ready action plan.
        </p>

        <div className="mt-9 max-w-2xl border border-ink bg-paper/80 p-3">
          <AnalysisInput />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="kicker">Tap to run</span>
          {tryRepos.map((repo) => (
            <Link
              key={repo}
              href={`/analyze?q=${encodeURIComponent(repo)}`}
              className="border border-ink/20 bg-white/65 px-3 py-2 font-mono text-xs font-bold text-ink transition-transform hover:-rotate-1 hover:border-action hover:bg-clarity"
            >
              {repo}
            </Link>
          ))}
        </div>

        <div className="mt-7 grid max-w-xl grid-cols-3 border border-ink/15 bg-white/50">
          {[
            ["9", "sources"],
            ["5", "ideas"],
            ["1", "verdict"],
          ].map(([value, label]) => (
            <div key={label} className="border-r border-ink/15 p-4 last:border-r-0">
              <p className="font-heading text-4xl leading-none tracking-[-0.06em] text-action">{value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <SignalArtwork />
        <div className="absolute -bottom-5 -left-5 hidden max-w-[260px] border border-ink bg-ink p-4 text-canvas sm:block">
          <p className="font-heading text-3xl uppercase leading-none tracking-[-0.06em]">
            Free: 5 ideas.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase leading-5 tracking-[0.16em] text-canvas/60">
            $29 unlocks the verdict, skip reasons, and validation path.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      code: "01",
      title: "Signal",
      body: "GitHub velocity, npm/PyPI demand, HN pain, and competitor density are pulled into one map.",
    },
    {
      code: "02",
      title: "Decide",
      body: "The engine compresses messy evidence into ranked ideas and a clear Build / Skip / Watch call.",
    },
    {
      code: "03",
      title: "Build",
      body: "BUILD verdicts open the workspace: blueprint, tasks, launch assets, and financial model.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-ink pb-6 md:flex-row md:items-end">
        <div>
          <p className="kicker">Product journey</p>
          <h2 className="mt-2 font-heading text-5xl uppercase tracking-[-0.06em] md:text-7xl">
            Scout, score, ship.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-ink/58">
          The interface should feel like a live operating room for founder decisions, not a static landing page.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className={`warm-card relative overflow-hidden p-7 ${index === 1 ? "md:-translate-y-5" : ""}`}
          >
            <span className="font-heading text-8xl uppercase leading-none tracking-[-0.08em] text-ink/[0.05]">
              {step.code}
            </span>
            <h3 className="mt-10 font-heading text-4xl uppercase tracking-[-0.06em]">
              {step.title}
            </h3>
            <p className="mt-4 text-sm leading-6 text-ink/62">{step.body}</p>
            <div className="mt-8 h-2 w-full bg-spectrum" />
          </article>
        ))}
      </div>

      <div className="mt-10 grid border border-ink bg-paper md:grid-cols-3">
        {[
          {
            title: "One BUILD path",
            body: "The first output is the recommended path, not a pile of ideas.",
          },
          {
            title: "Wrong work list",
            body: "Every result calls out the work you should not start yet.",
          },
          {
            title: "Build Room",
            body: "BUILD verdicts become blueprint, tasks, launch assets, and financial model.",
          },
        ].map((item) => (
          <div key={item.title} className="border-b border-ink p-6 md:border-b-0 md:border-r md:last:border-r-0">
            <h3 className="font-heading text-3xl uppercase tracking-[-0.06em]">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-ink/62">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmailCaptureSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
      <div className="ink-card grid gap-8 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-10">
        <div>
          <p className="kicker">Friday dispatch</p>
          <h2 className="mt-3 font-heading text-5xl uppercase tracking-[-0.06em]">
            Three repos. Three verdicts. One thing to avoid.
          </h2>
        </div>
        <EmailCapture source="homepage_digest" variant="inline" />
      </div>
    </section>
  );
}
