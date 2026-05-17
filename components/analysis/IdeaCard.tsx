"use client";

import { useState } from "react";
import type { TopIdea } from "@/hooks/useAnalysis";

interface IdeaCardProps {
  idea: TopIdea;
  rank: number;
  isLocked?: boolean;
  onUnlockClick?: () => void;
}

const rankColors: Record<number, string> = {
  1: "bg-[#FF4800] text-white",
  2: "bg-[#1A1A1A] text-white",
  3: "bg-[#1A1A1A] text-white",
  4: "bg-[#E8E4DD] text-[#8A8680]",
  5: "bg-[#E8E4DD] text-[#8A8680]",
};

const skipRiskColors: Record<string, string> = {
  LOW: "text-[#00C94A]",
  MEDIUM: "text-[#FFAA00]",
  HIGH: "text-[#FF2B2B]",
};

export function IdeaCard({ idea, rank, isLocked, onUnlockClick }: IdeaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const skipRiskKey = idea.skipRisk?.toUpperCase?.() ?? "";

  return (
    <div className="border border-[#E8E4DD] mb-3 bg-white transition-all duration-200">
      <div
        className="flex items-start gap-4 p-5 cursor-pointer hover:bg-[#FAFAF7] transition-colors"
        onClick={() => {
          if (isLocked) {
            onUnlockClick?.();
            return;
          }
          setExpanded((v) => !v);
        }}
      >
        <span
          className={`text-xs font-bold w-7 h-7 flex items-center justify-center shrink-0 ${
            rankColors[rank] || rankColors[5]
          }`}
        >
          {rank}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm uppercase tracking-wide leading-tight">
              {idea.name}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#8A8680]">{idea.buildWeeks}w</span>
              {isLocked ? (
                <span className="text-gray-300">🔒</span>
              ) : (
                <span
                  className={`text-xs transition-transform duration-200 text-[#8A8680] inline-block ${
                    expanded ? "rotate-180" : ""
                  }`}
                >
                  ↓
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-[#00B8A0] text-white">
              {idea.category?.replace(/_/g, " ")}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 bg-[#C5E600] text-[#1A1A1A]">
              {idea.roughPricing}
            </span>
          </div>

          <p className="text-xs text-[#6B6660] mt-2 line-clamp-2 leading-relaxed">
            {idea.oneLiner}
          </p>

          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="text-xs text-[#8A8680] italic truncate">
              {idea.targetCustomer}
            </span>
            {idea.skipRisk && (
              <span
                className={`text-xs font-bold uppercase tracking-wider shrink-0 ${
                  skipRiskColors[skipRiskKey] || "text-gray-400"
                }`}
              >
                Skip risk: {idea.skipRisk}
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && !isLocked && (
        <div className="border-t border-[#E8E4DD] bg-[#FAFAF7]">
          <IdeaSection title="The Opportunity">
            <div className="space-y-2 mb-4">
              {idea.signalEvidence?.map((ev, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#FF4800] mt-0.5 shrink-0">→</span>
                  <span className="text-sm text-[#1A1A1A]">{ev}</span>
                </div>
              ))}
            </div>
            {idea.marketGap && (
              <div className="bg-white border border-[#E8E4DD] p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A8680] mb-1">
                  The gap
                </p>
                <p className="text-sm text-[#1A1A1A]">{idea.marketGap}</p>
              </div>
            )}
          </IdeaSection>

          <IdeaSection title="The Business">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {idea.pricingTiers && idea.pricingTiers.length > 0 ? (
                idea.pricingTiers.map((tier, i) => (
                  <div
                    key={i}
                    className="border border-[#E8E4DD] p-3 bg-white text-center"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-[#8A8680] mb-1">
                      {tier.name}
                    </div>
                    <div className="text-lg font-bold text-[#FF4800]">
                      {tier.price}
                    </div>
                    <div className="text-xs text-[#8A8680]">
                      {tier.description}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-sm text-[#8A8680]">
                  {idea.roughPricing}
                </div>
              )}
            </div>
            {idea.revenueEstimate && (
              <div className="bg-[#E6FAF0] border border-[#00C94A] p-3">
                <span className="text-xs font-bold text-[#00C94A] uppercase tracking-wider">
                  90-day target:
                </span>
                <span className="text-sm font-bold text-[#1A1A1A] ml-2">
                  {idea.revenueEstimate}
                </span>
              </div>
            )}
          </IdeaSection>

          <IdeaSection title="Competition">
            {idea.competition && idea.competition.length > 0 ? (
              <div className="space-y-2">
                {idea.competition.map((comp, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-4 py-2 border-b border-[#E8E4DD] last:border-0"
                  >
                    <div>
                      <span className="text-sm font-bold">{comp.name}</span>
                      <span className="text-xs text-[#8A8680] ml-2">
                        {comp.price}
                      </span>
                    </div>
                    <span className="text-xs text-[#6B6660] text-right flex-1">
                      {comp.weakness}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#00C94A] font-bold">
                No direct competitors found at this price point
              </p>
            )}
          </IdeaSection>

          <IdeaSection title="Build Plan">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FF4800]">
                  {idea.buildWeeks}
                </div>
                <div className="text-xs uppercase tracking-wider text-[#8A8680]">
                  weeks
                </div>
              </div>
              <div className="flex-1 text-sm text-[#6B6660]">
                {idea.buildNotes ||
                  `Solo founder build targeting first paying customer by week ${idea.buildWeeks}.`}
              </div>
            </div>
          </IdeaSection>

          <IdeaSection
            title="Claude Code Prompts"
            action={
              <button
                onClick={() => {
                  const list =
                    idea.claudePrompts && idea.claudePrompts.length > 0
                      ? idea.claudePrompts
                      : generatedPrompts(idea);
                  const allPrompts = list
                    .map((p) => `// ${p.title}\n${p.prompt}`)
                    .join("\n\n---\n\n");
                  navigator.clipboard.writeText(allPrompts);
                }}
                className="text-xs font-bold text-[#FF4800] border border-[#FF4800] px-2 py-1 hover:bg-[#FF4800] hover:text-white transition-colors"
              >
                Copy all →
              </button>
            }
          >
            <div className="space-y-3">
              {(idea.claudePrompts && idea.claudePrompts.length > 0
                ? idea.claudePrompts
                : generatedPrompts(idea)
              ).map((p, i) => (
                <PromptBlock key={i} title={p.title} prompt={p.prompt} />
              ))}
            </div>
          </IdeaSection>

          <IdeaSection title="First Customers">
            <div className="mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A8680] mb-2">
                Who to target first
              </p>
              <p className="text-sm text-[#1A1A1A]">
                {idea.firstCustomerPath ||
                  `Find developers who filed GitHub issues requesting this feature.`}
              </p>
            </div>
            <OutreachTemplate idea={idea} />
          </IdeaSection>
        </div>
      )}

      {isLocked && (
        <div className="px-5 pb-4 pt-0">
          <button
            onClick={onUnlockClick}
            className="w-full text-center text-xs text-[#8A8680] border border-dashed border-[#E8E4DD] py-2 hover:border-[#FF4800] hover:text-[#FF4800] transition-colors"
          >
            Unlock full details →
          </button>
        </div>
      )}
    </div>
  );
}

function IdeaSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-[#E8E4DD] last:border-0">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#8A8680]">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function PromptBlock({ title, prompt }: { title: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-[#E8E4DD] bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8E4DD]">
        <span className="text-xs font-bold text-[#1A1A1A]">{title}</span>
        <button
          onClick={copy}
          className="text-xs font-bold text-[#FF4800] hover:underline"
        >
          {copied ? "Copied ✓" : "Copy →"}
        </button>
      </div>
      <pre className="text-xs text-[#6B6660] p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono max-h-32 overflow-y-auto">
        {prompt}
      </pre>
    </div>
  );
}

function generatedPrompts(idea: TopIdea) {
  return [
    {
      title: "1. Database schema",
      prompt: `Build a Prisma schema for a ${idea.name} platform.
Target customer: ${idea.targetCustomer}
Pricing model: ${idea.roughPricing}

Include tables for: users, subscriptions, usage tracking,
and the core domain model. Use Supabase + RLS policies.
Output complete schema.prisma file.`,
    },
    {
      title: "2. Core API routes",
      prompt: `Build Next.js API routes for ${idea.name}.
Tech stack: Next.js 14 App Router + Supabase + Stripe

Routes needed:
POST /api/provision — create new customer instance
GET  /api/usage     — fetch current usage metrics
POST /api/webhooks/stripe — handle billing events

Include auth middleware, error handling, TypeScript types.`,
    },
    {
      title: "3. Landing page copy",
      prompt: `Write landing page copy for ${idea.name}.
Target customer: ${idea.targetCustomer}
Price: ${idea.roughPricing}
Key benefit: ${idea.oneLiner}

Generate: headline (8 words), subheadline (1 sentence),
3 feature blocks, pricing section, and FAQ.
Tone: direct, technical, no hype.`,
    },
    {
      title: "4. First customer outreach",
      prompt: `Write a cold outreach message for ${idea.name}.
I found potential customers who filed GitHub issues
requesting this feature.

Write a 3-sentence DM/email that:
- References their specific issue
- Explains I built what they asked for
- Offers a free trial
- Does not sound salesy

Keep under 60 words total.`,
    },
  ];
}

function OutreachTemplate({ idea }: { idea: TopIdea }) {
  const template =
    idea.outreachTemplate ||
    `Hey, I noticed you're working in the ${idea.category?.replace(
      /_/g,
      " "
    )} space.

I built ${idea.name} — ${idea.oneLiner?.toLowerCase()}

Would you be open to a free 30-day trial?
No commitment, cancel anytime.`;

  const [copied, setCopied] = useState(false);

  return (
    <div className="border border-[#E8E4DD] bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8E4DD]">
        <span className="text-xs font-bold text-[#1A1A1A]">
          Outreach template
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(template);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs font-bold text-[#FF4800] hover:underline"
        >
          {copied ? "Copied ✓" : "Copy →"}
        </button>
      </div>
      <p className="text-xs text-[#6B6660] p-3 font-mono leading-relaxed whitespace-pre-line">
        {template}
      </p>
    </div>
  );
}
