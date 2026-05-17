import Link from "next/link";
import type { Metadata } from "next";
import { EmailCapture } from "@/components/marketing/EmailCapture";

export const metadata: Metadata = {
  title: "Methodology — How StackSignal Generates Verdicts",
  description:
    "Learn how StackSignal's 9-dimension scoring system analyzes demand, competition, moat potential, and platform risk to generate BUILD/SKIP/WATCH verdicts.",
};

const DIMENSIONS = [
  {
    id: "demand",
    name: "Demand Signal",
    weight: "High",
    sources: ["GitHub issues (hosting/enterprise requests)", "Hacker News 'Ask HN' unsolved posts", "npm/PyPI download trends"],
    description: "Measures whether real users are actively requesting solutions. We look for unmet needs, not just popularity metrics.",
    scoring: "0-2: No demand signals found. 3-5: Some mentions, unclear urgency. 6-8: Clear demand, multiple data points. 9-10: Urgent, recurring demand with payment intent.",
  },
  {
    id: "crowdedness",
    name: "Market Crowdedness",
    weight: "High",
    sources: ["Serper web search for competitors", "ProductHunt launched products", "Funded competitor detection (Crunchbase signals)"],
    description: "Counts and classifies existing players. A high score here is bad — it means the space is already saturated.",
    scoring: "0-2: Wide open. 3-5: Some competitors, differentiation possible. 6-8: Crowded with funded players. 9-10: Red ocean, VC-backed incumbents.",
  },
  {
    id: "wtp",
    name: "Willingness to Pay",
    weight: "High",
    sources: ["Competitor pricing analysis", "Issue language analysis (enterprise vs hobby)", "Market category benchmarks"],
    description: "Determines whether target users will pay for solutions or expect them free. Critical for solo founders who need revenue, not just users.",
    scoring: "0-2: Users expect free. 3-5: Freemium possible. 6-8: Clear paid market. 9-10: Enterprise budgets, high ARPU.",
  },
  {
    id: "gtm",
    name: "GTM Fit",
    weight: "Medium",
    sources: ["Distribution channel analysis", "Community presence assessment", "Content marketing potential"],
    description: "Can a solo founder reach customers without paid ads? Favors developer tools, open-source adjacent, and community-driven products.",
    scoring: "0-2: Requires enterprise sales. 3-5: Mixed channels. 6-8: Community-led growth possible. 9-10: Natural viral/organic distribution.",
  },
  {
    id: "complexity",
    name: "Build Complexity",
    weight: "Medium",
    sources: ["Technology stack requirements", "Third-party API dependencies", "Infrastructure needs"],
    description: "How long and hard is it to build an MVP? Lower complexity = faster validation = better for solo founders.",
    scoring: "0-2: Can ship in a weekend. 3-5: 2-4 week MVP. 6-8: Months of work. 9-10: Requires team, infrastructure, significant investment.",
  },
  {
    id: "speed",
    name: "Speed to Revenue",
    weight: "Medium",
    sources: ["MVP scope estimation", "Time-to-first-customer analysis", "Payment integration complexity"],
    description: "How quickly can you go from idea to first paying customer? Solo founders need revenue in weeks, not quarters.",
    scoring: "0-2: 6+ months to revenue. 3-5: 2-3 months. 6-8: Weeks. 9-10: Can charge on day one.",
  },
  {
    id: "moat",
    name: "Moat Potential",
    weight: "Medium",
    sources: ["Data network effects", "Switching costs", "Proprietary data advantages"],
    description: "Can you build defensibility over time? Without moat, you're building a feature that incumbents will copy.",
    scoring: "0-2: Pure commodity, easily replicated. 3-5: Mild differentiation. 6-8: Data or network effects possible. 9-10: Strong structural moat.",
  },
  {
    id: "platform-risk",
    name: "Platform Risk",
    weight: "Critical",
    sources: ["Single-vendor dependency check", "API terms of service analysis", "Platform history of eating ecosystems"],
    description: "The kill switch. If your product depends on one platform that could remove your access or build the feature themselves, that's existential risk.",
    scoring: "0-2: No platform dependency. 3-5: Uses APIs but diversified. 6-8: Single platform dependency. 9-10: Platform actively building competing feature.",
  },
  {
    id: "founder-fit",
    name: "Founder Fit",
    weight: "Variable",
    sources: ["Founder profile questionnaire", "Skills match analysis", "Domain expertise assessment"],
    description: "Personalizes the verdict to YOU. A great idea for the wrong founder is still a skip. Available when you complete your founder profile.",
    scoring: "0-2: No relevant skills/experience. 3-5: Learnable. 6-8: Adjacent expertise. 9-10: Deep domain match.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-action/20">
      {/* Hero */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <p className="font-mono text-[10px] text-ink/30 uppercase tracking-[0.3em] font-bold mb-6">
          Methodology / Scoring System
        </p>
        <h1 className="text-5xl md:text-7xl font-heading tracking-tighter uppercase leading-[0.9] mb-8">
          How we decide<br />
          <span className="text-action">build or skip</span>
        </h1>
        <p className="text-lg text-ink/60 max-w-2xl leading-relaxed">
          Every StackSignal verdict is generated from 9 scored dimensions, each
          backed by real data sources. No opinions, no vibes — just signals.
        </p>
      </section>

      {/* Overview */}
      <section className="px-6 py-16 border-t-2 border-ink/5 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="border-2 border-action/30 p-6">
            <p className="font-mono text-[10px] text-action uppercase tracking-[0.3em] font-bold mb-2">Verdict: BUILD</p>
            <p className="text-sm text-ink/60 leading-relaxed">
              High demand + low crowdedness + clear WTP + manageable complexity.
              The signals say &quot;go.&quot;
            </p>
          </div>
          <div className="border-2 border-ink/10 p-6">
            <p className="font-mono text-[10px] text-ink/40 uppercase tracking-[0.3em] font-bold mb-2">Verdict: WATCH</p>
            <p className="text-sm text-ink/60 leading-relaxed">
              Interesting signals but insufficient evidence. Check back in 30 days
              as data accumulates.
            </p>
          </div>
          <div className="border-2 border-ink/30 p-6">
            <p className="font-mono text-[10px] text-ink uppercase tracking-[0.3em] font-bold mb-2">Verdict: SKIP</p>
            <p className="text-sm text-ink/60 leading-relaxed">
              Critical risk factors detected. Overcrowded, platform-dependent,
              or no willingness to pay. Walk away.
            </p>
          </div>
        </div>
      </section>

      {/* Dimensions */}
      <section className="px-6 py-16 border-t-2 border-ink/5 bg-ink text-canvas">
        <div className="max-w-7xl mx-auto">
          <p className="font-mono text-[10px] text-action uppercase tracking-[0.3em] font-bold mb-4">
            The 9 Dimensions
          </p>
          <h2 className="text-3xl font-heading tracking-tighter uppercase mb-12">
            What we measure and why
          </h2>

          <div className="space-y-6">
            {DIMENSIONS.map((dim, i) => (
              <div key={dim.id} className="border border-canvas/10 p-8">
                <div className="flex items-start justify-between gap-8 mb-6">
                  <div>
                    <span className="font-mono text-[10px] text-action font-bold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-xl font-heading tracking-tighter uppercase mt-2">
                      {dim.name}
                    </h3>
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1 ${
                    dim.weight === "Critical" ? "bg-action text-white" :
                    dim.weight === "High" ? "bg-canvas/20 text-canvas" :
                    "bg-canvas/10 text-canvas/60"
                  }`}>
                    {dim.weight} weight
                  </span>
                </div>

                <p className="text-sm text-canvas/60 leading-relaxed mb-6">{dim.description}</p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="font-mono text-[10px] text-canvas/30 uppercase tracking-widest font-bold mb-3">
                      Data Sources
                    </p>
                    <ul className="space-y-2">
                      {dim.sources.map((src) => (
                        <li key={src} className="text-sm text-canvas/50 flex items-start gap-2">
                          <span className="text-action mt-0.5">›</span>
                          {src}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] text-canvas/30 uppercase tracking-widest font-bold mb-3">
                      Scoring Guide
                    </p>
                    <p className="text-sm text-canvas/40 leading-relaxed">{dim.scoring}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decision Logic */}
      <section className="px-6 py-20 border-t-2 border-ink/5 max-w-4xl mx-auto">
        <p className="font-mono text-[10px] text-ink/30 uppercase tracking-[0.3em] font-bold mb-4">
          Decision Logic
        </p>
        <h2 className="text-3xl font-heading tracking-tighter uppercase mb-8">
          How scores become verdicts
        </h2>

        <div className="space-y-6 text-ink/60 leading-relaxed">
          <p>
            The composite score is <strong className="text-ink">not</strong> a simple average.
            Critical dimensions like Platform Risk can override everything else —
            if platform risk scores 9+, the verdict is always SKIP regardless of other scores.
          </p>
          <p>
            We use Gemini 2.5 Flash as the decision engine, feeding it all 9 dimension scores
            plus the raw signal data. The AI synthesizes patterns that pure math would miss:
            a technology might score well on demand but have a known history of platform
            crackdowns that only contextual reasoning catches.
          </p>
          <p>
            Every verdict comes with a confidence score (0-10) indicating how strong the
            signal evidence is. Low confidence means we need more data — that&apos;s usually
            a WATCH verdict.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t-2 border-ink/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-heading tracking-tighter uppercase mb-4">
            See the methodology in action
          </h2>
          <p className="text-ink/50 mb-8">
            Check the leaderboard for real verdicts, or submit your own analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/leaderboard" className="inline-block bg-ink text-canvas px-8 py-4 font-heading uppercase tracking-widest text-sm hover:bg-action transition-colors">
              View Leaderboard
            </Link>
            <Link href="/analyze" className="inline-block border-2 border-ink px-8 py-4 font-heading uppercase tracking-widest text-sm hover:bg-ink hover:text-canvas transition-colors">
              Analyze a Project
            </Link>
          </div>
          <EmailCapture source="methodology" variant="inline" />
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
