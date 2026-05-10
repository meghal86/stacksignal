"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type EmailCaptureProps = {
  source?: string;
  variant?: "inline" | "banner" | "footer";
  className?: string;
};

export function EmailCapture({ source = "homepage", variant = "inline", className = "" }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
        return;
      }

      setStatus("success");
      setMessage(data.message);
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className={`${className}`}>
        <div className={`
          ${variant === "banner" ? "p-8 bg-ink text-canvas border-2 border-action" : "p-6 bg-white border-2 border-ink"}
        `}>
          <div className="flex items-center gap-4">
            <span className="text-3xl">✓</span>
            <div>
              <p className="font-heading text-xl uppercase tracking-tighter">Signal locked.</p>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mt-1">{message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`bg-ink text-canvas ${className}`}>
        <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-canvas/40 mb-3 font-bold">Weekly Intelligence</p>
            <h3 className="text-4xl md:text-5xl font-heading uppercase tracking-tighter leading-[0.9] mb-4">
              3 THINGS<br /><span className="text-action">NOT</span> TO BUILD
            </h3>
            <p className="text-sm text-canvas/50 font-mono uppercase tracking-tight font-bold max-w-md">
              Every week: skip signals, build opportunities, and the data behind both. Free.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="flex-1 w-full max-w-lg">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@company.com"
                className="h-14 flex-1 bg-canvas/10 border-canvas/20 text-canvas placeholder:text-canvas/30 px-5"
                disabled={status === "loading"}
                required
              />
              <Button
                type="submit"
                disabled={status === "loading"}
                className="h-14 px-8 bg-action text-white border-0 font-heading uppercase tracking-tight hover:bg-[#e34000] transition-all whitespace-nowrap"
              >
                {status === "loading" ? "..." : "GET SIGNALS →"}
              </Button>
            </div>
            {status === "error" && (
              <p className="mt-3 text-[10px] font-mono text-action uppercase tracking-widest">{message}</p>
            )}
            <p className="mt-4 text-[9px] font-mono text-canvas/20 uppercase tracking-widest">
              Join 0 founders who read the anti-hype newsletter. Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <form onSubmit={handleSubmit} className={`space-y-3 ${className}`}>
        <p className="font-mono text-[10px] text-ink/20 uppercase tracking-widest font-bold">Newsletter</p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-10 flex-1 bg-transparent border-ink/10 text-sm"
            disabled={status === "loading"}
            required
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            size="sm"
            className="h-10 px-4 font-heading uppercase text-[10px]"
          >
            {status === "loading" ? "..." : "→"}
          </Button>
        </div>
        {status === "error" && (
          <p className="text-[10px] font-mono text-action">{message}</p>
        )}
      </form>
    );
  }

  // Default inline variant
  return (
    <div className={`p-8 bg-white border-2 border-ink relative overflow-hidden ${className}`}>
      <div className="absolute -top-4 -right-4 text-7xl font-heading opacity-[0.03] uppercase rotate-12 pointer-events-none select-none">
        SIGNAL
      </div>
      <div className="relative z-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/40 font-bold mb-2">Free Weekly Report</p>
        <h3 className="font-heading text-2xl uppercase tracking-tighter mb-4">Get the skip report.</h3>
        <p className="text-sm text-ink/60 mb-6">Every week: 3 things NOT to build, 1 hidden opportunity, signal data.</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="founder@company.com"
            className="h-12 flex-1 border-2 border-ink bg-canvas px-4 text-sm"
            disabled={status === "loading"}
            required
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            className="h-12 px-6 font-heading uppercase text-sm whitespace-nowrap"
          >
            {status === "loading" ? "Subscribing..." : "Subscribe →"}
          </Button>
        </form>
        {status === "error" && (
          <p className="mt-3 text-[10px] font-mono text-action uppercase tracking-widest">{message}</p>
        )}
      </div>
    </div>
  );
}
