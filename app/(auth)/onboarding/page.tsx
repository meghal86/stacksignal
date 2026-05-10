"use client";

import { useState } from "react";
import Link from "next/link";

const BACKGROUND_OPTIONS = [
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "Mobile Developer",
  "DevOps / Infrastructure",
  "Data Science / ML",
  "Designer",
  "Product Manager",
  "Marketing / Growth",
  "Business / Finance",
  "Student",
  "Non-Technical Founder",
];

const INDUSTRY_OPTIONS = [
  "Developer Tools",
  "AI / ML",
  "SaaS / B2B",
  "FinTech",
  "HealthTech",
  "EdTech",
  "E-Commerce",
  "Creator Economy",
  "Gaming",
  "Crypto / Web3",
  "Climate / Energy",
  "Real Estate",
  "Logistics",
  "Other",
];

const TIMELINE_OPTIONS = [
  { value: "weekend", label: "This weekend", desc: "Ship in 2 days" },
  { value: "2-weeks", label: "2 weeks", desc: "Sprint-sized MVP" },
  { value: "1-month", label: "1 month", desc: "Proper prototype" },
  { value: "3-months", label: "3 months", desc: "Full product" },
  { value: "exploring", label: "Just exploring", desc: "No pressure" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [background, setBackground] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleItem = (
    item: string,
    current: string[],
    setter: (v: string[]) => void
  ) => {
    if (current.includes(item)) {
      setter(current.filter((i) => i !== item));
    } else {
      setter([...current, item]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/founder-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background, industries, timeline }),
      });
      if (res.ok) {
        setSaved(true);
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="text-6xl mb-6">✓</div>
          <h1 className="text-3xl font-heading tracking-tighter uppercase mb-4">
            Profile saved
          </h1>
          <p className="text-ink/50 mb-8">
            Your analyses will now include personalized founder-fit scoring.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-ink text-canvas px-8 py-4 font-heading uppercase tracking-widest text-sm hover:bg-action transition-colors"
          >
            Go to Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-action/20">
      {/* Nav */}
      <nav className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <Link
          href="/"
          className="text-xl font-heading tracking-tighter uppercase hover:text-action transition-colors"
        >
          STACKSIGNAL
        </Link>
        <span className="font-mono text-[10px] text-ink/30 uppercase tracking-[0.3em] font-bold">
          Step {step} of 3
        </span>
      </nav>

      <div className="h-[3px] bg-spectrum" />

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-6 pt-8">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-[3px] flex-1 transition-colors ${
                s <= step ? "bg-action" : "bg-ink/10"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        {step === 1 && (
          <div>
            <p className="font-mono text-[10px] text-action uppercase tracking-[0.3em] font-bold mb-4">
              Question 1
            </p>
            <h1 className="text-3xl md:text-5xl font-heading tracking-tighter uppercase leading-[0.9] mb-4">
              What&apos;s your background?
            </h1>
            <p className="text-ink/50 mb-10">
              Select all that apply. This helps us score founder-fit for each
              technology.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {BACKGROUND_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleItem(opt, background, setBackground)}
                  className={`text-left px-4 py-3 border-2 text-sm font-mono uppercase tracking-wide transition-colors ${
                    background.includes(opt)
                      ? "border-action bg-action/5 text-ink"
                      : "border-ink/10 text-ink/50 hover:border-ink/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-12">
              <button
                onClick={() => setStep(2)}
                disabled={background.length === 0}
                className="bg-ink text-canvas px-8 py-4 font-heading uppercase tracking-widest text-sm hover:bg-action transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="font-mono text-[10px] text-action uppercase tracking-[0.3em] font-bold mb-4">
              Question 2
            </p>
            <h1 className="text-3xl md:text-5xl font-heading tracking-tighter uppercase leading-[0.9] mb-4">
              What industries interest you?
            </h1>
            <p className="text-ink/50 mb-10">
              Pick areas where you have domain knowledge or strong interest.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {INDUSTRY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleItem(opt, industries, setIndustries)}
                  className={`text-left px-4 py-3 border-2 text-sm font-mono uppercase tracking-wide transition-colors ${
                    industries.includes(opt)
                      ? "border-action bg-action/5 text-ink"
                      : "border-ink/10 text-ink/50 hover:border-ink/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-12">
              <button
                onClick={() => setStep(1)}
                className="border-2 border-ink/10 px-8 py-4 font-heading uppercase tracking-widest text-sm text-ink/50 hover:border-ink/30 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={industries.length === 0}
                className="bg-ink text-canvas px-8 py-4 font-heading uppercase tracking-widest text-sm hover:bg-action transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="font-mono text-[10px] text-action uppercase tracking-[0.3em] font-bold mb-4">
              Question 3
            </p>
            <h1 className="text-3xl md:text-5xl font-heading tracking-tighter uppercase leading-[0.9] mb-4">
              What&apos;s your build timeline?
            </h1>
            <p className="text-ink/50 mb-10">
              When do you want to ship? This affects complexity scoring.
            </p>

            <div className="space-y-3">
              {TIMELINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeline(opt.value)}
                  className={`w-full text-left px-6 py-5 border-2 flex items-center justify-between transition-colors ${
                    timeline === opt.value
                      ? "border-action bg-action/5"
                      : "border-ink/10 hover:border-ink/30"
                  }`}
                >
                  <div>
                    <span className="font-heading uppercase tracking-tighter text-lg">
                      {opt.label}
                    </span>
                    <p className="text-sm text-ink/40 mt-1">{opt.desc}</p>
                  </div>
                  {timeline === opt.value && (
                    <span className="text-action text-xl">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-12">
              <button
                onClick={() => setStep(2)}
                className="border-2 border-ink/10 px-8 py-4 font-heading uppercase tracking-widest text-sm text-ink/50 hover:border-ink/30 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={!timeline || saving}
                className="bg-action text-white px-8 py-4 font-heading uppercase tracking-widest text-sm hover:bg-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
