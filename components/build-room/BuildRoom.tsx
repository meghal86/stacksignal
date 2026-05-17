"use client";

import Link from "next/link";
import { useState } from "react";
import { useBuildRoom } from "@/hooks/useBuildRoom";
import type { BuildRoomStatusResponse, BuildRoomTabStatus } from "@/lib/build-room/types";
import { DecisionTab } from "@/components/build-room/tabs/DecisionTab";
import { BlueprintTab } from "@/components/build-room/tabs/BlueprintTab";
import { BuildTasksTab } from "@/components/build-room/tabs/BuildTasksTab";
import { LaunchTab } from "@/components/build-room/tabs/LaunchTab";
import { FinancialsTab } from "@/components/build-room/tabs/FinancialsTab";

type TabKey = "decision" | "blueprint" | "tasks" | "launch" | "financials";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "decision", label: "Decision" },
  { key: "blueprint", label: "Blueprint" },
  { key: "tasks", label: "Build Tasks" },
  { key: "launch", label: "Launch" },
  { key: "financials", label: "Financials" },
];

function tabStatusLabel(status?: BuildRoomTabStatus) {
  if (status === "generating") return "Generating...";
  if (status === "locked" || status === "awaiting_approval") return "Locked";
  return null;
}

function tabState(key: TabKey, buildTabs: ReturnType<typeof useBuildRoom>["tabs"]): BuildRoomTabStatus {
  if (key === "decision") return "ready";
  if (key === "tasks") return buildTabs.buildTasks;
  return buildTabs[key];
}

export function BuildRoom({
  analysisId,
  initialData,
}: {
  analysisId: string;
  initialData: BuildRoomStatusResponse;
}) {
  const {
    status,
    tabs: buildTabs,
    content,
    blueprintApproved,
    launchApproved,
    error,
    startGeneration,
    approveBlueprint,
    approveLaunch,
    exportToMarkdown,
  } = useBuildRoom(analysisId, initialData);
  const [activeTab, setActiveTab] = useState<TabKey>("decision");

  const renderedActiveTab = activeTab === "launch" && (buildTabs.launch === "locked" || buildTabs.launch === "awaiting_approval") ? "blueprint" : activeTab;

  const clickTab = (key: TabKey) => {
    const state = tabState(key, buildTabs);
    if (state === "locked" || state === "awaiting_approval") {
      if (key === "launch") setActiveTab("blueprint");
      return;
    }
    setActiveTab(key);
  };

  return (
    <main className="min-h-screen bg-[#F5F0E8] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border border-[#1A1A1A] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E4DD] px-5 py-4">
            <Link href="/dashboard" className="font-mono text-xs uppercase tracking-[0.14em] text-[#1A1A1A]/65 hover:text-[#FF4800]">
              ← Back to Analysis
            </Link>
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#FF4800]">BUILD ROOM</p>
              <h1 className="font-heading text-3xl font-black tracking-tight">Founder workspace</h1>
            </div>
            <div className="font-mono text-xs uppercase tracking-[0.14em] text-[#1A1A1A]/65">Signal Scout</div>
          </div>

          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const state = tabState(tab.key, buildTabs);
              const active = renderedActiveTab === tab.key;
              const locked = state === "locked" || state === "awaiting_approval";
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => clickTab(tab.key)}
                  className={`min-w-max border-b-2 px-5 py-4 text-left font-mono text-xs font-bold uppercase tracking-[0.14em] transition ${
                    active ? "border-[#FF4800] text-[#FF4800]" : "border-transparent text-[#1A1A1A]/55 hover:text-[#1A1A1A]"
                  } ${locked ? "cursor-not-allowed text-[#1A1A1A]/30" : ""}`}
                >
                  <span>{tab.label}</span>
                  {tabStatusLabel(state) ? <span className="ml-2 text-[10px] normal-case tracking-normal">{tabStatusLabel(state)}</span> : null}
                </button>
              );
            })}
          </nav>
        </header>

        {error ? (
          <div className="mt-8 border border-[#FF2B2B] bg-white p-6">
            <p className="font-heading text-2xl font-black text-[#FF2B2B]">Build Room error</p>
            <p className="mt-2 text-sm text-[#1A1A1A]/70">{error}</p>
            <button type="button" onClick={() => void startGeneration()} className="mt-5 border border-[#1A1A1A] bg-[#FF4800] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white">
              Retry generation
            </button>
          </div>
        ) : null}

        {!content ? (
          <div className="mt-8 border border-[#E8E4DD] bg-white p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin border-2 border-[#E8E4DD] border-t-[#FF4800]" />
            <p className="mt-5 font-heading text-3xl font-black text-[#1A1A1A]">
              {status === "idle" ? "Build Room has not started" : "Generating Build Room"}
            </p>
            <p className="mt-2 text-sm text-[#1A1A1A]/60">Tabs will unlock as the job writes generated drafts.</p>
            {status === "idle" ? (
              <button type="button" onClick={() => void startGeneration()} className="mt-6 border border-[#1A1A1A] bg-[#FF4800] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white">
                Start Build Room
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-8">
            {renderedActiveTab === "decision" ? <DecisionTab content={content} /> : null}
            {renderedActiveTab === "blueprint" ? <BlueprintTab content={content} blueprintApproved={blueprintApproved} onApprove={approveBlueprint} /> : null}
            {renderedActiveTab === "tasks" ? <BuildTasksTab content={content} onDownloadMarkdown={exportToMarkdown} /> : null}
            {renderedActiveTab === "launch" ? (
              <LaunchTab
                content={content}
                locked={!blueprintApproved}
                launchApproved={launchApproved}
                onApprove={approveLaunch}
                onGoBlueprint={() => setActiveTab("blueprint")}
              />
            ) : null}
            {renderedActiveTab === "financials" ? <FinancialsTab content={content} /> : null}
          </div>
        )}
      </div>
    </main>
  );
}
