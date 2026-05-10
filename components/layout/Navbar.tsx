"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { usePathname } from "next/navigation";

export function Navbar({ user }: { user?: any }) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full bg-canvas/80 backdrop-blur-md border-b border-ink/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-heading tracking-tighter uppercase hover:text-action transition-colors">
            STACKSIGNAL
          </Link>
          
          <div className="hidden md:flex items-center gap-6 font-mono text-[10px] font-bold uppercase tracking-widest">
            <Link 
              href="/leaderboard" 
              className={pathname === "/leaderboard" ? "text-action" : "text-ink/60 hover:text-ink transition-colors"}
            >
              Leaderboard
            </Link>
            <Link 
              href="/about" 
              className={pathname === "/about" ? "text-action" : "text-ink/60 hover:text-ink transition-colors"}
            >
              About
            </Link>
            <Link 
              href="/methodology" 
              className={pathname === "/methodology" ? "text-action" : "text-ink/60 hover:text-ink transition-colors"}
            >
              Methodology
            </Link>
            {user && (
              <Link 
                href="/dashboard" 
                className={pathname === "/dashboard" ? "text-action" : "text-ink/60 hover:text-ink transition-colors"}
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <Link href="/pricing" className="text-[10px] font-mono font-bold uppercase tracking-widest text-ink/60 hover:text-ink transition-colors px-4">
                Pricing
              </Link>
              <Link href="/login">
                <Button size="sm" className="font-heading uppercase text-[10px] px-6">Get Started</Button>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end mr-4">
                <span className="text-[9px] font-mono font-bold text-ink/40 uppercase tracking-tighter">Credits</span>
                <span className="text-xs font-heading text-action">{user.creditsBalance ?? 0}</span>
              </div>
              <form action="/api/auth/sign-out" method="post">
                <Button size="sm" variant="outline" type="submit" className="text-[10px] font-heading uppercase px-4 border-ink/10">
                  Sign Out
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
      {/* Spectrum Divider */}
      <div className="h-[1px] w-full bg-spectrum" />
    </nav>
  );
}
