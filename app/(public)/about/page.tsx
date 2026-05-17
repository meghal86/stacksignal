import Link from "next/link";
import type { Metadata } from "next";
import { EmailCapture } from "@/components/marketing/EmailCapture";

export const metadata: Metadata = {
  title: "About StackSignal — Decision Compression for Founders",
  description:
    "StackSignal analyzes ecosystem signals to tell you what NOT to build. Save 6 months of wasted effort with automated market intelligence.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-action/20">
      {/* Hero */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <p className="font-mono text-[10px] text-ink/30 uppercase tracking-[0.3em] font-bold mb-6">
          About / Signal Scout Engine
        </p>
        <h1 className="text-5xl md:text-7xl font-heading tracking-tighter uppercase leading-[0.9] mb-8">
          We tell you what<br />
          <span className="text-action">not</span> to build.
        </h1>
        <p className="text-lg text-ink/60 max-w-2xl leading-relaxed">
          StackSignal is a decision compression engine for indie founders.
          We analyze real ecosystem signals — GitHub activity, npm downloads,
          competition density, community demand — and generate a BUILD, SKIP, or WATCH verdict
          so you spend time on ideas worth pursuing.
        </p>
      </section>

      {/* The Problem */}
      <section className="px-6 py-20 border-t-2 border-ink/5 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <p className="font-mono text-[10px] text-action uppercase tracking-[0.3em] font-bold mb-4">
              The Problem
            </p>
            <h2 className="text-3xl font-heading tracking-tighter uppercase mb-6">
              6 months building the wrong thing
            </h2>
            <p className="text-ink/60 leading-relaxed mb-4">
              Most solo founders skip market validation. They see a trending technology,
              get excited, build for months, then discover the market is saturated,
              users won&apos;t pay, or a VC-backed competitor already owns the space.
            </p>
            <p className="text-ink/60 leading-relaxed">
              The data was always there. Nobody was reading it.
            </p>
          </div>

          <div className="border-2 border-ink/10 p-8">
            <p className="font-mono text-[10px] text-ink/30 uppercase tracking-[0.3em] font-bold mb-6">
              What founders do today
            </p>
            <div className="space-y-4">
              {[
                { step: "01", text: "See trending tech on Hacker News", status: "❌" },
                { step: "02", text: "Get excited, start building", status: "❌" },
                { step: "03", text: "3 months later — discover 12 competitors", status: "❌" },
                { step: "04", text: "6 months later — no paying users", status: "❌" },
                { step: "05", text: "Abandon project, repeat", status: "❌" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-4">
                  <span className="font-mono text-[10px] text-ink/20 font-bold">{item.step}</span>
                  <span className="text-sm text-ink/60">{item.text}</span>
                  <span className="ml-auto text-sm">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 border-t-2 border-ink/5 bg-ink text-canvas">
        <div className="max-w-7xl mx-auto">
          <p className="font-mono text-[10px] text-action uppercase tracking-[0.3em] font-bold mb-4">
            How It Works
          </p>
          <h2 className="text-3xl font-heading tracking-tighter uppercase mb-12">
            Signal → Score → Verdict
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "Signal Collection",
                desc: "We pull real data from GitHub (stars, velocity, issues), npm/PyPI (downloads, trends), Hacker News (unsolved problems), and competition databases (funded players, ProductHunt).",
              },
              {
                num: "02",
                title: "Composite Scoring",
                desc: "Nine dimensions scored 0-10: demand, crowdedness, willingness to pay, GTM fit, build complexity, speed to revenue, moat potential, platform risk, and founder fit.",
              },
              {
                num: "03",
                title: "Decision Engine",
                desc: "Our AI synthesizes scores into a BUILD, SKIP, or WATCH verdict with confidence rating, skip reasons, top ideas, MVP scope, and a 7-day validation plan.",
              },
            ].map((step) => (
              <div key={step.num} className="border border-canvas/10 p-8">
                <span className="font-mono text-[10px] text-action font-bold">{step.num}</span>
                <h3 className="text-xl font-heading tracking-tighter uppercase mt-4 mb-4">
                  {step.title}
                </h3>
                <p className="text-sm text-canvas/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="px-6 py-20 border-t-2 border-ink/5 max-w-7xl mx-auto">
        <p className="font-mono text-[10px] text-ink/30 uppercase tracking-[0.3em] font-bold mb-4">
          What You Get
        </p>
        <h2 className="text-3xl font-heading tracking-tighter uppercase mb-12">
          Not another idea validator
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            { title: "Skip Reports", desc: "Know why NOT to build — with data. Our most popular output. $29 each." },
            { title: "Signal Leaderboard", desc: "Public, real-time ranking of trending technologies by build-worthiness." },
            { title: "Weekly Newsletter", desc: '"3 Things NOT to Build This Week" — the highest-signal content for founders.' },
            { title: "Build Room (Pro)", desc: "For BUILD verdicts: technical spec, financial model, launch checklist, and marketing assets." },
          ].map((item) => (
            <div key={item.title} className="border-2 border-ink/10 p-6 hover:border-action/30 transition-colors">
              <h3 className="font-heading tracking-tighter uppercase text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-ink/50 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t-2 border-ink/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-heading tracking-tighter uppercase mb-4">
            Stop building blind
          </h2>
          <p className="text-ink/50 mb-8">
            Join the newsletter and get weekly skip signals before you waste another weekend.
          </p>
          <EmailCapture source="about" variant="inline" />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t-2 border-ink/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-ink/30">
            © 2026 STACKSIGNAL ENGINE
          </p>
          <div className="flex gap-8 text-[10px] font-mono text-ink/30 uppercase tracking-widest font-bold">
            <Link href="/terms" className="hover:text-action transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-action transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

      <div className="h-2 w-full bg-spectrum" />
    </div>
  );
}
