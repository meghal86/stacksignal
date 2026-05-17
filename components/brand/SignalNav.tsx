import Link from "next/link";

const navItems = [
  { href: "/", label: "Scan" },
  { href: "/analyze", label: "Analyze" },
  { href: "/leaderboard", label: "Signals" },
  { href: "/pricing", label: "Pricing" },
];

export function SignalNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-canvas/90 backdrop-blur-md">
      <div className="h-[3px] bg-spectrum" />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center border border-ink bg-action text-canvas transition-transform group-hover:-rotate-6">
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-pill bg-clarity" />
            <span className="font-heading text-lg leading-none">S</span>
          </span>
          <span>
            <span className="block font-heading text-lg uppercase tracking-[-0.06em] text-ink">
              StackSignal
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.24em] text-ink/40 sm:block">
              Signal Scout Engine
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-pill border border-ink/10 bg-white/45 p-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-pill px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55 transition-colors hover:bg-ink hover:text-canvas"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="hidden border border-ink bg-clarity px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink transition-transform hover:-rotate-1 sm:inline-flex"
          >
            Get Verdict
          </Link>
          <Link
            href="/analyze"
            className="border border-ink bg-action px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-transform hover:rotate-1"
          >
            Analyze →
          </Link>
        </div>
      </nav>
    </header>
  );
}
