import Link from "next/link";
import { SignalArtwork } from "@/components/brand/SignalArtwork";

const reportLink = process.env.NEXT_PUBLIC_STRIPE_REPORT_LINK || "/analyze";
const builderLink = process.env.NEXT_PUBLIC_STRIPE_BUILDER_LINK || "/signup?next=/dashboard";

const plans = [
  {
    name: "Free",
    price: "$0",
    note: "Start scouting",
    href: "/analyze",
    cta: "Start free",
    tone: "bg-white/70",
    features: ["3 analyses / month", "Top 5 ideas only", "Shareable discovery page", "Trending repo leaderboard"],
  },
  {
    name: "Verdict",
    price: "$29",
    note: "One-time report",
    href: reportLink,
    cta: "Get verdict",
    featured: true,
    tone: "bg-action text-white",
    features: ["1 full verdict", "Skip reasons", "7-day validation plan", "Shareable report URL"],
  },
  {
    name: "Builder",
    price: "$19",
    note: "Per month",
    href: builderLink,
    cta: "Subscribe",
    tone: "bg-clarity",
    features: ["30 credits / month", "All free features", "Validation plans", "History and Build Rooms"],
  },
];

const faqs = [
  {
    q: 'What is a "credit"?',
    a: "A credit is one analysis unit. Basic discovery costs 1 credit. Full decisions and Build Room generation use more because they run deeper scoring and AI synthesis.",
  },
  {
    q: "What is the difference between Skip and Watch?",
    a: "SKIP means the risk is clear enough to avoid the opportunity. WATCH means the signal is interesting but not yet strong enough to commit founder time.",
  },
  {
    q: "Can I share my report?",
    a: "Yes. Public reports are designed to be shareable with teammates, customers, investors, or your own audience.",
  },
  {
    q: "What signals do you use?",
    a: "GitHub activity, package downloads, HN demand language, competition density, velocity, maintenance health, and generated market evidence.",
  },
];

export const metadata = {
  title: "Pricing — StackSignal",
  description: "Simple pricing for StackSignal verdicts and builder credits.",
};

export default function PricingPage() {
  return (
    <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <section className="grid items-end gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="kicker">Pricing</p>
          <h1 className="mt-3 display-title text-7xl uppercase sm:text-9xl">
            Decision compression.
            <span className="block text-action">No tricks.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/62">
            Pay when you need the call. Subscribe when you want StackSignal running as a weekly founder radar.
          </p>
        </div>
        <SignalArtwork label="Payment gate: manual only" compact />
      </section>

      <section className="mt-12 grid border border-ink bg-paper/72 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`relative flex min-h-[420px] flex-col border-b border-ink p-6 md:border-b-0 md:border-r md:last:border-r-0 ${plan.tone}`}
          >
            {plan.featured ? (
              <span className="absolute right-4 top-4 rounded-pill bg-clarity px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
                Most direct
              </span>
            ) : null}
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] opacity-55">{plan.note}</p>
            <h2 className="mt-4 font-heading text-5xl uppercase tracking-[-0.06em]">{plan.name}</h2>
            <div className="mt-6 flex items-end gap-2">
              <span className="font-heading text-7xl uppercase leading-none tracking-[-0.08em]">{plan.price}</span>
              {plan.name === "Builder" ? <span className="mb-2 font-mono text-xs uppercase tracking-[0.12em]">/mo</span> : null}
            </div>
            <ul className="mt-8 space-y-3 text-sm leading-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span className="font-mono">↳</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {plan.featured ? (
              <div className="my-6 border border-white/45 bg-white/15 px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                One paid decision, no dark patterns.
              </div>
            ) : null}
            <Link
              href={plan.href}
              className={`mt-auto inline-flex justify-center border border-ink px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] transition-transform hover:-rotate-1 ${
                plan.featured ? "bg-white text-ink" : "bg-ink text-canvas"
              }`}
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border border-ink bg-ink p-6 text-canvas">
          <p className="kicker text-canvas/45">FAQ</p>
          <h2 className="mt-4 font-heading text-5xl uppercase tracking-[-0.06em]">
            The small print, made large.
          </h2>
        </div>
        <div className="grid gap-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="warm-card group p-5">
              <summary className="cursor-pointer list-none font-heading text-2xl uppercase tracking-[-0.05em]">
                {faq.q}
                <span className="float-right font-mono text-action transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/62">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
