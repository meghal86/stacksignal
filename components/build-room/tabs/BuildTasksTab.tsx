"use client";

import { useMemo, useState } from "react";
import type { AgentTask, BuildRoomContent, FounderTask } from "@/lib/build-room/types";

type ExportMode = "github" | "notion" | null;

function taskId(task: AgentTask | FounderTask, index: number) {
  return task.id ?? `${task.title}-${index}`;
}

function parseGitHubRepo(input: string) {
  const match = input.trim().match(/github\.com\/([^/]+)\/([^/\s]+)|^([^/\s]+)\/([^/\s]+)$/);
  if (!match) return null;
  return {
    owner: match[1] ?? match[3],
    repo: (match[2] ?? match[4]).replace(/\.git$/, ""),
  };
}

function taskMarkdown(agentTasks: AgentTask[], founderTasks: FounderTask[]) {
  return [
    "# Build Tasks",
    "",
    "## Agent Tasks",
    ...agentTasks.map((task) => `- [ ] ${task.title} (${task.estimatedMinutes ?? "?"} min)\n  ${task.description}`),
    "",
    "## Founder Decisions",
    ...founderTasks.map((task) => `- [ ] ${task.title} (${task.estimatedMinutes ?? "?"} min)\n  ${task.description}`),
  ].join("\n");
}

export function BuildTasksTab({
  content,
  onDownloadMarkdown,
}: {
  content: BuildRoomContent;
  onDownloadMarkdown: () => void;
}) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const agentTasks = useMemo(() => content.agentTasks ?? [], [content.agentTasks]);
  const founderTasks = useMemo(() => content.founderTasks ?? [], [content.founderTasks]);
  const markdown = useMemo(() => taskMarkdown(agentTasks, founderTasks), [agentTasks, founderTasks]);

  const copyPrompt = async (task: AgentTask, id: string) => {
    await navigator.clipboard.writeText(task.claudeCodePrompt ?? `${task.title}\n\n${task.description}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const toggle = (id: string) => {
    setCompleted((current) => ({ ...current, [id]: !current[id] }));
  };

  const exportGitHubIssues = async () => {
    const parsed = parseGitHubRepo(repoUrl);
    if (!parsed) {
      setExportMessage("Enter a GitHub repo as owner/repo or a github.com URL.");
      return;
    }
    if (!token.trim()) {
      setExportMessage("A GitHub token is required before creating issues.");
      return;
    }

    setExporting(true);
    setExportMessage(null);
    try {
      for (const task of agentTasks) {
        const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues`, {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: task.title,
            body: `${task.description}\n\n## Claude Code Prompt\n\n\`\`\`\n${task.claudeCodePrompt ?? ""}\n\`\`\``,
            labels: ["agent-task", "stacksignal"],
          }),
        });

        if (!response.ok) {
          throw new Error(`GitHub rejected issue creation for "${task.title}".`);
        }
      }
      setExportMessage(`Created ${agentTasks.length} GitHub issues in ${parsed.owner}/${parsed.repo}.`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "GitHub export failed.");
    } finally {
      setExporting(false);
    }
  };

  const exportNotionDraft = async () => {
    await navigator.clipboard.writeText(markdown);
    setExportMessage("Checklist copied. Paste it into Notion after reviewing it.");
  };

  return (
    <section className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="font-heading text-3xl font-black text-[#1A1A1A]">Agent Tasks</p>
            <p className="mt-1 text-sm text-[#1A1A1A]/60">Draft prompts for Claude Code. Review before running each task.</p>
          </div>
          {agentTasks.map((task, index) => {
            const id = taskId(task, index);
            return (
              <article key={id} className="border border-[#E8E4DD] bg-white p-5">
                <div className="flex items-start gap-3">
                  <input className="mt-1 h-4 w-4 accent-[#FF4800]" type="checkbox" checked={Boolean(completed[id])} onChange={() => toggle(id)} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-xl font-bold text-[#1A1A1A]">{task.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#1A1A1A]/65">{task.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A]/55">
                      <span>{task.estimatedMinutes ?? "?"} min</span>
                      {task.dependsOn?.length ? <span>Depends on {task.dependsOn.join(", ")}</span> : <span>No dependencies</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyPrompt(task, id)}
                      className="mt-4 border border-[#1A1A1A] px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#1A1A1A] hover:text-white"
                    >
                      {copiedId === id ? "Copied" : "Copy Prompt"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="space-y-4">
          <div>
            <p className="font-heading text-3xl font-black text-[#1A1A1A]">Your Decisions</p>
            <p className="mt-1 text-sm text-[#1A1A1A]/60">These require judgment, approval, or customer context.</p>
          </div>
          {founderTasks.map((task, index) => {
            const id = taskId(task, index);
            return (
              <article key={id} className="border border-[#E8E4DD] bg-white p-5">
                <div className="flex items-start gap-3">
                  <input className="mt-1 h-4 w-4 accent-[#FF4800]" type="checkbox" checked={Boolean(completed[id])} onChange={() => toggle(id)} />
                  <div>
                    <h3 className="font-heading text-xl font-bold text-[#1A1A1A]">{task.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#1A1A1A]/65">{task.description}</p>
                    {task.whyHuman ? <p className="mt-3 text-sm italic text-[#FF4800]">{task.whyHuman}</p> : null}
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A]/55">{task.estimatedMinutes ?? "?"} min</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="border border-[#1A1A1A] bg-[#F5F0E8] p-6">
        <p className="font-heading text-2xl font-black text-[#1A1A1A]">Export reviewed tasks</p>
        <p className="mt-2 text-sm text-[#1A1A1A]/65">External exports require an explicit confirmation. Nothing is sent automatically.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => setExportMode("github")} className="border border-[#1A1A1A] bg-white px-4 py-3 font-mono text-xs uppercase tracking-[0.14em]">
            Export to GitHub Issues
          </button>
          <button type="button" onClick={() => setExportMode("notion")} className="border border-[#1A1A1A] bg-white px-4 py-3 font-mono text-xs uppercase tracking-[0.14em]">
            Export to Notion
          </button>
          <button type="button" onClick={onDownloadMarkdown} className="border border-[#1A1A1A] bg-[#1A1A1A] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-white">
            Download as Markdown
          </button>
        </div>
      </div>

      {exportMode ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1A1A1A]/55 p-4">
          <div className="w-full max-w-xl border border-[#1A1A1A] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-2xl font-black text-[#1A1A1A]">{exportMode === "github" ? "Confirm GitHub export" : "Confirm Notion export"}</p>
                <p className="mt-2 text-sm text-[#1A1A1A]/65">
                  {exportMode === "github"
                    ? `This will create ${agentTasks.length} issues after you confirm.`
                    : "This copies a reviewed checklist draft for Notion. It does not write to Notion automatically."}
                </p>
              </div>
              <button type="button" onClick={() => setExportMode(null)} className="font-mono text-xs uppercase tracking-[0.14em]">
                Close
              </button>
            </div>

            {exportMode === "github" ? (
              <div className="mt-5 space-y-3">
                <input
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="owner/repo or https://github.com/owner/repo"
                  className="w-full border-2 border-[#1A1A1A] px-4 py-3 text-sm outline-none"
                />
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="GitHub token"
                  type="password"
                  className="w-full border-2 border-[#1A1A1A] px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={exportGitHubIssues}
                  disabled={exporting}
                  className="border border-[#1A1A1A] bg-[#FF4800] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white disabled:bg-[#1A1A1A]/40"
                >
                  {exporting ? "Creating..." : `Confirm create ${agentTasks.length} issues`}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={exportNotionDraft}
                className="mt-5 border border-[#1A1A1A] bg-[#FF4800] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white"
              >
                Confirm copy Notion checklist
              </button>
            )}
            {exportMessage ? <p className="mt-4 border border-[#E8E4DD] bg-[#F5F0E8] p-3 text-sm text-[#1A1A1A]/70">{exportMessage}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
