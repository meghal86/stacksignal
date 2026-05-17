"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const searchParams = useSearchParams();
  const supabase = createBrowserClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next")!)}` : ""}`,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setIsLoading(false);
    } else {
      setMessage({ type: "success", text: "Check your email for the confirmation link!" });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 bg-canvas relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]">
        <div className="absolute top-10 left-10 w-96 h-96 border border-ink" />
        <div className="absolute bottom-10 right-10 w-64 h-64 border border-ink" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white border-2 border-ink p-8 card-sharp shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-heading uppercase mb-2">Create Account</h1>
            <p className="text-xs font-mono text-ink/60 uppercase tracking-widest">
              Join the signal intelligence network
            </p>
          </div>

          {message && (
            <div className={`p-4 mb-6 text-xs font-mono uppercase tracking-tight ${
              message.type === "success" ? "bg-clarity/20 text-insight border-2 border-clarity" : "bg-red-50 text-red-600 border-2 border-red-600"
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
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
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-ink/5 text-center">
            <p className="text-[10px] font-mono uppercase text-ink/40">
              Already have an account?{" "}
              <Link 
                href={`/login${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next")!)}` : ""}`} 
                className="text-action font-bold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <SignupForm />
    </Suspense>
  );
}
