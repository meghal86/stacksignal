"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setIsLoading(false);
    } else {
      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setMessage({ type: "error", text: "Please enter your email first" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Check your email for the magic link!" });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 bg-canvas relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]">
        <div className="absolute top-10 left-10 w-96 h-96 border border-ink" />
        <div className="absolute bottom-10 right-10 w-64 h-64 border border-ink" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-ink rounded-full" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white border-2 border-ink p-8 card-sharp shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-heading uppercase mb-2">Access Portal</h1>
            <p className="text-xs font-mono text-ink/60 uppercase tracking-widest">
              Authenticate to view signal intelligence
            </p>
          </div>

          {message && (
            <div className={`p-4 mb-6 text-xs font-mono uppercase tracking-tight ${
              message.type === "success" ? "bg-clarity/20 text-insight border-2 border-clarity" : "bg-red-50 text-red-600 border-2 border-red-600"
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-ink/40">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="founder@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-ink/40">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 font-heading uppercase text-sm"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase">
                <span className="bg-white px-4 text-ink/40">Alternative</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleMagicLink}
              disabled={isLoading}
              className="w-full h-12 font-heading uppercase text-[10px]"
            >
              Send Magic Link
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-ink/5 text-center">
            <p className="text-[10px] font-mono uppercase text-ink/40">
              Don&apos;t have an account?{" "}
              <Link 
                href={`/signup${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next")!)}` : ""}`} 
                className="text-action font-bold hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center font-mono text-[9px] text-ink/30 uppercase tracking-widest px-2">
          <span>System v1.0.42</span>
          <span>Status: Operational</span>
          <span>Secure Encrypted Connection</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <LoginForm />
    </Suspense>
  );
}
