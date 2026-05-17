"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BuildRoomContent,
  BuildRoomStatusResponse,
  BuildRoomTabs,
  BuildRoomTabStatus,
} from "@/lib/build-room/types";

type BuildRoomHookStatus = "idle" | "generating" | "ready" | "error";

const DEFAULT_TABS: BuildRoomTabs = {
  blueprint: "locked",
  buildTasks: "locked",
  launch: "locked",
  financials: "locked",
};

function hasGeneratingTab(tabs: BuildRoomTabs) {
  return Object.values(tabs).some((status) => status === "generating");
}

function normalizeTabs(tabs?: Partial<Record<keyof BuildRoomTabs, BuildRoomTabStatus>>): BuildRoomTabs {
  return {
    blueprint: tabs?.blueprint ?? DEFAULT_TABS.blueprint,
    buildTasks: tabs?.buildTasks ?? DEFAULT_TABS.buildTasks,
    launch: tabs?.launch ?? DEFAULT_TABS.launch,
    financials: tabs?.financials ?? DEFAULT_TABS.financials,
  };
}

function buildMarkdown(content: BuildRoomContent) {
  const agentTasks = content.agentTasks ?? [];
  const founderTasks = content.founderTasks ?? [];

  return [
    `# Build Room: ${content.selectedIdea?.name ?? content.analysis?.rawInput ?? "Opportunity"}`,
    "",
    `Business model: ${content.businessModel ?? "TBD"}`,
    "",
    "## Product Spec",
    content.productSpec ?? "Pending",
    "",
    "## Agent Tasks",
    ...agentTasks.map((task) => `- [ ] ${task.title}: ${task.description}`),
    "",
    "## Founder Decisions",
    ...founderTasks.map((task) => `- [ ] ${task.title}: ${task.description}`),
    "",
    "## Financial Model",
    `Monthly fixed costs: $${content.financialModel?.totalMonthlyFixed ?? content.financialModel?.burn ?? 0}`,
  ].join("\n");
}

export function useBuildRoom(analysisId: string, initialData?: BuildRoomStatusResponse) {
  const [status, setStatus] = useState<BuildRoomHookStatus>(() => {
    if (initialData?.status === "ready") return "ready";
    if (initialData?.status === "generating") return "generating";
    return "idle";
  });
  const [tabs, setTabs] = useState<BuildRoomTabs>(() => normalizeTabs(initialData?.tabs));
  const [content, setContent] = useState<BuildRoomContent | null>(initialData?.content ?? null);
  const [blueprintApproved, setBlueprintApproved] = useState(Boolean(initialData?.blueprintApproved));
  const [launchApproved, setLaunchApproved] = useState(Boolean(initialData?.launchApproved));
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    const response = await fetch(`/api/analyze/${analysisId}/build-room`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Failed to fetch Build Room status");
    }

    const data = (await response.json()) as BuildRoomStatusResponse;
    const nextTabs = normalizeTabs(data.tabs);

    if (data.content) setContent(data.content);
    setTabs(nextTabs);
    setBlueprintApproved(Boolean(data.blueprintApproved ?? data.content?.blueprintApproved));
    setLaunchApproved(Boolean(data.launchApproved ?? data.content?.launchApproved));

    if (data.status === "ready") setStatus("ready");
    else if (data.status === "generating" || hasGeneratingTab(nextTabs)) setStatus("generating");
    else setStatus("idle");

    return data;
  }, [analysisId]);

  const startGeneration = useCallback(async () => {
    setError(null);
    setStatus("generating");
    setTabs({
      blueprint: "generating",
      buildTasks: "generating",
      launch: "locked",
      financials: "generating",
    });

    const response = await fetch(`/api/analyze/${analysisId}/build-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      const message = body?.error ?? "Failed to start Build Room generation";
      setError(message);
      setStatus("error");
      throw new Error(message);
    }

    await fetchStatus();
  }, [analysisId, fetchStatus]);

  const approveGate = useCallback(
    async (gate: "blueprint" | "launch") => {
      const response = await fetch(`/api/analyze/${analysisId}/build-room`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gate }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to approve gate");
      }

      if (gate === "blueprint") setBlueprintApproved(true);
      if (gate === "launch") setLaunchApproved(true);
      await fetchStatus();
    },
    [analysisId, fetchStatus]
  );

  const approveBlueprint = useCallback(() => approveGate("blueprint"), [approveGate]);
  const approveLaunch = useCallback(() => approveGate("launch"), [approveGate]);

  const exportToMarkdown = useCallback(() => {
    if (!content) return;
    const blob = new Blob([buildMarkdown(content)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `build-room-${analysisId}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [analysisId, content]);

  useEffect(() => {
    if (initialData?.status === "not_started") {
      const timer = setTimeout(() => {
        void startGeneration().catch((caught) => {
          setError(caught instanceof Error ? caught.message : "Build Room generation failed");
          setStatus("error");
        });
      }, 0);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [initialData?.status, startGeneration]);

  useEffect(() => {
    if (status !== "generating" && !hasGeneratingTab(tabs)) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      return;
    }

    if (!pollingRef.current) {
      pollingRef.current = setInterval(() => {
        void fetchStatus().catch((caught) => {
          setError(caught instanceof Error ? caught.message : "Build Room polling failed");
          setStatus("error");
        });
      }, 3000);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [fetchStatus, status, tabs]);

  return useMemo(
    () => ({
      status,
      tabs,
      content,
      blueprintApproved,
      launchApproved,
      error,
      startGeneration,
      approveBlueprint,
      approveBluprint: approveBlueprint,
      approveLaunch,
      exportToMarkdown,
      resetError: () => setError(null),
    }),
    [
      approveBlueprint,
      approveLaunch,
      blueprintApproved,
      content,
      error,
      exportToMarkdown,
      launchApproved,
      startGeneration,
      status,
      tabs,
    ]
  );
}
