"use client";

import { useMemo, useState } from "react";
import type { BuildRoomContent, LandingCopy, LaunchAssets, LaunchPost } from "@/lib/build-room/types";

function isLaunchAssets(value: BuildRoomContent["landingCopy"]): value is LaunchAssets {
  return Boolean(value && typeof value === "object" && ("landingCopy" in value || "waitlistOffer" in value || "firstProspects" in value));
}

function normalizeLaunch(content: BuildRoomContent): LaunchAssets {
  if (isLaunchAssets(content.landingCopy)) return content.landingCopy;
  return {
    landingCopy: (content.landingCopy as LandingCopy | null) ?? undefined,
    launchPosts: content.launchPosts ?? [],
    waitlistOffer: undefined,
    firstProspects: {
      whereToFind: content.prospectList ?? [],
    },
  };
}

function postText(post: LaunchPost) {
  if ("thread" in post && post.thread) return post.thread.join("\n\n");
  if ("post" in post && post.post) return post.post;
  if ("content" in post && post.content) return post.content;
  return [("title" in post ? post.title : "") ?? "", ("body" in post ? post.body : "") ?? ""].filter(Boolean).join("\n\n");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function LaunchTab({
  content,
  locked,
  launchApproved,
  onApprove,
  onGoBlueprint,
}: {
  content: BuildRoomContent;
  locked: boolean;
  launchApproved: boolean;
  onApprove: () => Promise<void>;
  onGoBlueprint: () => void;
}) {
  const initial = useMemo(() => normalizeLaunch(content), [content]);
  const landing = initial.landingCopy ?? {};
  const posts = initial.launchPosts ?? content.launchPosts ?? [];
  const [headline, setHeadline] = useState(landing.headline ?? landing.heroTitle ?? "");
  const [subheadline, setSubheadline] = useState(landing.subheadline ?? landing.heroSubtitle ?? "");
  const [cta, setCta] = useState(landing.heroCTA ?? landing.cta ?? "Join Waitlist");
  const [featureText, setFeatureText] = useState(
    landing.featureBlocks?.map((feature) => `${feature.title}: ${feature.description}`).join("\n") ?? landing.features?.join("\n") ?? ""
  );
  const [activePost, setActivePost] = useState(posts[0]?.platform ?? "HackerNews");
  const [postDrafts, setPostDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(posts.map((post) => [post.platform, postText(post)]))
  );
  const [outreach, setOutreach] = useState(initial.firstProspects?.outreachTemplate ?? "");
  const [copied, setCopied] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const previewHtml = `
<!doctype html>
<html>
  <body style="margin:0;font-family:Space Grotesk,Arial,sans-serif;background:#F5F0E8;color:#1A1A1A;">
    <main style="padding:48px;max-width:900px;margin:auto;">
      <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#FF4800;font-weight:700;">Preview</p>
      <h1 style="font-size:56px;line-height:.95;margin:16px 0;">${escapeHtml(headline || "Launch headline")}</h1>
      <p style="font-size:20px;line-height:1.5;max-width:680px;">${escapeHtml(subheadline || "Subheadline")}</p>
      <button style="margin-top:28px;background:#FF4800;color:white;border:1px solid #1A1A1A;padding:16px 22px;text-transform:uppercase;letter-spacing:.14em;font-weight:700;">${escapeHtml(cta)}</button>
      <pre style="margin-top:36px;white-space:pre-wrap;background:white;border:1px solid #E8E4DD;padding:20px;">${escapeHtml(featureText)}</pre>
    </main>
  </body>
</html>`;

  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const approve = async () => {
    setApproving(true);
    try {
      await onApprove();
    } finally {
      setApproving(false);
    }
  };

  if (locked) {
    return (
      <section className="border border-[#E8E4DD] bg-white p-10 text-center">
        <p className="font-heading text-3xl font-black text-[#1A1A1A]">Approve the Blueprint to unlock Launch assets</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[#1A1A1A]/60">
          Launch copy is gated behind human review so the product does not move from architecture to market without approval.
        </p>
        <button
          type="button"
          onClick={onGoBlueprint}
          className="mt-6 border border-[#1A1A1A] bg-[#FF4800] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white"
        >
          Go to Blueprint →
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="border border-[#FFAA00] bg-[#FFF8DD] p-4 text-sm text-[#1A1A1A]">
        Review before posting. StackSignal does not post on your behalf. Copy and post manually.
      </div>

      <div className="border border-[#E8E4DD] bg-white p-6">
        <p className="font-heading text-3xl font-black text-[#1A1A1A]">Landing Page Copy</p>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A]/55">Headline</span>
            <textarea value={headline} onChange={(event) => setHeadline(event.target.value)} className="min-h-20 border-2 border-[#1A1A1A] p-3 outline-none" />
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A]/55">Subheadline</span>
            <textarea value={subheadline} onChange={(event) => setSubheadline(event.target.value)} className="min-h-20 border-2 border-[#1A1A1A] p-3 outline-none" />
          </label>
          <label className="grid gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A]/55">Features</span>
            <textarea value={featureText} onChange={(event) => setFeatureText(event.target.value)} className="min-h-32 border-2 border-[#1A1A1A] p-3 outline-none" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => copy("landing", `${headline}\n\n${subheadline}\n\n${featureText}`)} className="border border-[#1A1A1A] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em]">
              {copied === "landing" ? "Copied" : "Copy landing copy"}
            </button>
            <button type="button" onClick={() => setCta(cta || "Join Waitlist")} className="border border-[#1A1A1A] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em]">
              Preview Landing Page →
            </button>
          </div>
          <iframe title="Landing page preview" className="h-[360px] w-full border border-[#1A1A1A] bg-white" srcDoc={previewHtml} />
        </div>
      </div>

      <div className="border border-[#E8E4DD] bg-white p-6">
        <p className="font-heading text-3xl font-black text-[#1A1A1A]">Launch Posts</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {posts.map((post) => (
            <button
              key={post.platform}
              type="button"
              onClick={() => setActivePost(post.platform)}
              className={`border px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] ${
                activePost === post.platform ? "border-[#1A1A1A] bg-[#FF4800] text-white" : "border-[#E8E4DD] bg-white text-[#1A1A1A]/60"
              }`}
            >
              {post.platform}
            </button>
          ))}
        </div>
        <textarea
          value={postDrafts[activePost] ?? ""}
          onChange={(event) => setPostDrafts((current) => ({ ...current, [activePost]: event.target.value }))}
          className="mt-4 min-h-64 w-full border-2 border-[#1A1A1A] p-4 outline-none"
        />
        <button type="button" onClick={() => copy("post", postDrafts[activePost] ?? "")} className="mt-3 border border-[#1A1A1A] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em]">
          {copied === "post" ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border border-[#E8E4DD] bg-white p-6">
          <p className="font-heading text-2xl font-black text-[#1A1A1A]">Waitlist Offer</p>
          <p className="mt-4 text-lg font-bold">{initial.waitlistOffer?.headline ?? "Join the early access list"}</p>
          <p className="mt-2 text-sm text-[#1A1A1A]/65">{initial.waitlistOffer?.incentive ?? "Early users get founder-led onboarding."}</p>
          <button
            type="button"
            onClick={() => copy("waitlist", `${initial.waitlistOffer?.headline ?? ""}\n${initial.waitlistOffer?.incentive ?? ""}\n${initial.waitlistOffer?.ctaText ?? ""}`)}
            className="mt-4 border border-[#1A1A1A] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em]"
          >
            {copied === "waitlist" ? "Copied" : "Copy all"}
          </button>
        </div>
        <div className="border border-[#E8E4DD] bg-white p-6">
          <p className="font-heading text-2xl font-black text-[#1A1A1A]">First Prospects</p>
          <p className="mt-3 text-sm text-[#1A1A1A]/65">{initial.firstProspects?.profileDescription ?? "Find operators already solving this manually."}</p>
          <div className="mt-4 space-y-2">
            {(initial.firstProspects?.whereToFind ?? []).map((place) => (
              <p key={place} className="text-sm text-[#1A1A1A]/70">• {place}</p>
            ))}
          </div>
          <textarea value={outreach} onChange={(event) => setOutreach(event.target.value)} className="mt-4 min-h-36 w-full border-2 border-[#1A1A1A] p-3 outline-none" />
          <button type="button" onClick={() => copy("outreach", outreach)} className="mt-3 border border-[#1A1A1A] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em]">
            {copied === "outreach" ? "Copied" : "Copy template"}
          </button>
        </div>
      </div>

      <div className="border border-[#1A1A1A] bg-[#F5F0E8] p-6">
        <p className="font-heading text-2xl font-black text-[#1A1A1A]">Review launch assets before using them</p>
        <p className="mt-2 text-sm text-[#1A1A1A]/65">This approval is tracking only. It does not post anything.</p>
        <button
          type="button"
          onClick={approve}
          disabled={launchApproved || approving}
          className="mt-5 border border-[#1A1A1A] bg-[#FF4800] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:bg-[#1A1A1A]/35"
        >
          {launchApproved ? "Launch Ready" : approving ? "Saving..." : "I've reviewed — Mark Launch Ready ✓"}
        </button>
      </div>
    </section>
  );
}
