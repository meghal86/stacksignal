"use client";

import Link from "next/link";
import { useState } from "react";

export interface LeaderboardEntry {
  repoName: string;
  analysisId: string;
  slug: string;
  verdict: "BUILD" | "WATCH" | "SKIP" | null;
  signalScore: number;
  topIdea: string;
}

type LeaderboardData = {
  entries?: LeaderboardEntry[];
  date?: string;
};

const VERDICT_COLORS = {
  BUILD: { bg: "#E6FAF0", text: "#00A33A", border: "#00C94A", icon: "●" },
  WATCH: { bg: "#FFF5E0", text: "#996600", border: "#FFAA00", icon: "●" },
  SKIP: { bg: "#FFE8E8", text: "#CC2200", border: "#FF2B2B", icon: "●" },
};

export function LeaderboardSection({ data }: { data: LeaderboardData }) {
  const entries = data?.entries ?? [];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-6 border-b border-ink pb-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-action" />
            <span className="kicker">Live signal scan</span>
          </div>
          <h2 className="font-heading text-5xl uppercase tracking-[-0.06em] text-[#1A1A1A] md:text-7xl">
            Today&apos;s top opportunities
          </h2>
          <p className="mt-1 text-[#1A1A1A]/55">Updated daily at 6am UTC across top trending repos</p>
        </div>

        <Link href="/analyze" className="border border-ink bg-ink px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-canvas transition-transform hover:-rotate-1">
          Analyze your own →
        </Link>
      </div>

      {entries.length < 3 ? (
        <EmptyLeaderboard />
      ) : (
        <div className="border border-ink bg-paper/72">
          {entries.map((entry, index) => (
            <LeaderboardRow key={entry.slug} rank={index + 1} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

function LeaderboardRow({ rank, entry }: { rank: number; entry: LeaderboardEntry }) {
  const colors = entry.verdict ? VERDICT_COLORS[entry.verdict] : VERDICT_COLORS.WATCH;

  return (
    <Link
      href={`/report/${entry.slug}`}
      className="group grid grid-cols-[42px_1.6fr_1fr_108px_86px_24px] items-center gap-4 border-b border-ink/10 px-4 py-6 transition-colors last:border-b-0 hover:bg-white/70 sm:px-6 max-lg:grid-cols-[32px_1fr_76px_20px]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center border border-ink/15 font-heading text-xl font-bold text-[#1A1A1A]/35 group-hover:border-action group-hover:bg-action group-hover:text-white">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <div className="truncate font-heading text-xl font-bold uppercase tracking-[-0.05em] text-[#1A1A1A] group-hover:text-[#FF4800]">{entry.repoName}</div>
        <div className="mt-0.5 truncate text-xs text-[#1A1A1A]/40">Workflow orchestration and ecosystem signals</div>
      </div>

      <div className="min-w-0 max-lg:hidden">
        <div className="truncate text-sm font-medium text-[#1A1A1A]/70">{entry.topIdea || "Opportunity scan"}</div>
      </div>

      <span
        className="shrink-0 px-2 py-1 text-center font-mono text-xs font-bold uppercase tracking-wider"
        style={{
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}
      >
        {entry.verdict ?? "WATCH"}
      </span>

      <div className="shrink-0 text-right">
        <div className="font-heading text-3xl font-bold text-[#FF4800]">{entry.signalScore?.toFixed(1) ?? "0.0"}</div>
        <div className="text-xs text-[#1A1A1A]/25">/12</div>
      </div>

      <span className="shrink-0 text-[#1A1A1A]/25 transition-colors group-hover:text-[#FF4800]">→</span>
    </Link>
  );
}

function EmptyLeaderboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function triggerScan() {
    const secret = window.prompt("Admin secret");
    if (!secret) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/leaderboard/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, runNow: true }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Refresh failed");
      setMessage(body?.message ?? "Scan complete. Refreshing...");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-dashed border-ink p-16 text-center">
      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-pill bg-action text-5xl text-white">◉</div>
      <h3 className="mb-2 font-heading text-4xl font-bold uppercase tracking-[-0.06em] text-[#1A1A1A]">Scanning repos...</h3>
      <p className="mx-auto mb-6 max-w-md text-sm text-[#1A1A1A]/45">
        The daily signal scan is running. Check back in a few minutes or trigger a manual scan.
      </p>
      <button
        type="button"
        onClick={triggerScan}
        disabled={loading}
        className="border border-ink bg-[#FF4800] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60"
      >
        {loading ? "Scanning..." : "Trigger scan manually"}
      </button>
      {message ? <p className="mt-4 font-mono text-xs text-[#1A1A1A]/45">{message}</p> : null}
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="border border-ink p-12 text-center font-mono text-xs uppercase tracking-widest text-[#1A1A1A]/35">
        Loading signal scan...
      </div>
    </section>
  );
}
