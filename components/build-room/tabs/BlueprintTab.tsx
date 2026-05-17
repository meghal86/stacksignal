"use client";

import { useState } from "react";
import type { ApiMapItem, BuildRoomContent, StackRecommendation } from "@/lib/build-room/types";

function splitBoundary(text?: string | null) {
  if (!text) {
    return {
      inScope: ["One paying-customer workflow", "Authenticated dashboard", "Billing-ready MVP"],
      outScope: ["Broad integrations", "Mobile apps", "Enterprise administration"],
    };
  }

  const [inPart, outPart] = text.split(/OUT:/i);
  const cleanedIn = inPart.replace(/IN:/i, "").trim();
  return {
    inScope: cleanedIn.split(/[.;]/).map((item) => item.trim()).filter(Boolean),
    outScope: (outPart ?? "").split(/[.;]/).map((item) => item.trim()).filter(Boolean),
  };
}

function getToolName(rec: StackRecommendation) {
  return rec.winner ?? rec.tool ?? rec.category;
}

function getApiRoute(item: ApiMapItem) {
  return item.route ?? item.path ?? "-";
}

export function BlueprintTab({
  content,
  blueprintApproved,
  onApprove,
}: {
  content: BuildRoomContent;
  blueprintApproved: boolean;
  onApprove: () => Promise<void>;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const architecture = content.architecture ?? {};
  const mvpBoundary = typeof architecture.mvpBoundary === "string" ? architecture.mvpBoundary : null;
  const stackRecs = content.stackRecs ?? [];
  const apiMap = content.apiMap ?? [];
  const boundary = splitBoundary(mvpBoundary);

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

  return (
    <section className="space-y-8">
      <div className="border border-[#1A1A1A] bg-[#F5F0E8] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#FF4800]">Product Spec</p>
        <p className="mt-3 max-w-4xl text-lg leading-8 text-[#1A1A1A]">
          {content.productSpec ?? "Generating the technical blueprint for this BUILD opportunity."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(architecture).filter(([layer]) => layer !== "mvpBoundary").map(([layer, value]) => (
          <div key={layer} className="grid grid-cols-[140px_1fr] border border-[#E8E4DD] bg-white">
            <div className="border-r border-[#E8E4DD] bg-[#F5F0E8] p-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A]/55">
              {layer}
            </div>
            <div className="p-4 text-sm leading-6 text-[#1A1A1A]">{value}</div>
          </div>
        ))}
      </div>

      <div className="border border-[#1A1A1A] bg-white">
        <div className="flex items-center justify-between border-b border-[#E8E4DD] px-5 py-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">Database Schema</p>
          <button
            type="button"
            onClick={() => copy("schema", content.prismaSchema ?? "")}
            className="border border-[#1A1A1A] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-[#1A1A1A] hover:text-white"
          >
            {copied === "schema" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto bg-[#1A1A1A] p-5 text-sm leading-6 text-[#F5F0E8]">
          <code>{content.prismaSchema ?? "// Schema generation pending"}</code>
        </pre>
      </div>

      <div className="border border-[#E8E4DD] bg-white">
        <div className="border-b border-[#E8E4DD] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em]">API Map</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-[#F5F0E8] text-left font-mono text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A]/60">
              <tr>
                <th className="border-b border-[#E8E4DD] p-4">Method</th>
                <th className="border-b border-[#E8E4DD] p-4">Route</th>
                <th className="border-b border-[#E8E4DD] p-4">Purpose</th>
                <th className="border-b border-[#E8E4DD] p-4">Auth</th>
              </tr>
            </thead>
            <tbody>
              {apiMap.map((item, index) => (
                <tr key={`${getApiRoute(item)}-${index}`}>
                  <td className="border-b border-[#E8E4DD] p-4 font-mono text-xs font-bold">{item.method}</td>
                  <td className="border-b border-[#E8E4DD] p-4 font-mono text-xs">{getApiRoute(item)}</td>
                  <td className="border-b border-[#E8E4DD] p-4">{item.purpose ?? item.description}</td>
                  <td className="border-b border-[#E8E4DD] p-4">{item.auth ? "Required" : "Public"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stackRecs.map((rec, index) => (
          <div key={`${rec.category}-${index}`} className="border border-[#E8E4DD] bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-heading text-xl font-black text-[#1A1A1A]">{getToolName(rec)}</h3>
              <span className="bg-[#00B8A0] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white">{rec.category}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#1A1A1A]/75">{rec.whyForThisOpp ?? "Recommended for fastest path to a paid MVP."}</p>
            <p className="mt-3 text-sm leading-6 text-[#1A1A1A]/55">{rec.vsAlternative ?? "Tradeoff pending."}</p>
            {rec.affiliateUrl ? (
              <a
                href={rec.affiliateUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex border border-[#1A1A1A] bg-[#1A1A1A] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-white"
              >
                Use {getToolName(rec)} →
              </a>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-[#00B8A0] bg-white p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#00B8A0]">In Scope</p>
          <div className="mt-4 space-y-3">
            {boundary.inScope.map((item) => (
              <p key={item} className="text-sm text-[#1A1A1A]/75">✓ {item}</p>
            ))}
          </div>
        </div>
        <div className="border border-[#FF2B2B] bg-white p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#FF2B2B]">Out of Scope</p>
          <div className="mt-4 space-y-3">
            {boundary.outScope.map((item) => (
              <p key={item} className="text-sm text-[#1A1A1A]/75">× {item}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-[#1A1A1A] bg-[#F5F0E8] p-6">
        <p className="font-heading text-2xl font-black text-[#1A1A1A]">Review this blueprint before continuing</p>
        <p className="mt-2 text-sm text-[#1A1A1A]/65">Human approval is required before Launch assets unlock. Nothing posts or deploys from this screen.</p>
        <button
          type="button"
          onClick={approve}
          disabled={blueprintApproved || approving}
          className="mt-5 border border-[#1A1A1A] bg-[#FF4800] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:bg-[#1A1A1A]/35"
        >
          {blueprintApproved ? "Blueprint Approved" : approving ? "Approving..." : "Approve Blueprint → Unlock Launch"}
        </button>
      </div>
    </section>
  );
}
