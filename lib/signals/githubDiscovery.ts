export type StackCategory = "ai_infra" | "developer_tools" | "data_backend" | "frontend" | "observability";

export type DiscoveredRepo = {
  category: StackCategory;
  categoryLabel: string;
  fullName: string;
  url: string;
  description: string;
  stars: number;
  language: string;
  pushedAt: string;
  reason: string;
};

const STACK_SEARCHES: Array<{
  category: StackCategory;
  label: string;
  query: string;
  reason: string;
}> = [
  {
    category: "ai_infra",
    label: "AI infrastructure",
    query: "topic:artificial-intelligence stars:>1000",
    reason: "AI infrastructure has strong builder demand and fast-changing tooling.",
  },
  {
    category: "developer_tools",
    label: "Developer tools",
    query: "topic:developer-tools stars:>1000",
    reason: "Developer tooling produces clear workflow pains and willingness to pay.",
  },
  {
    category: "data_backend",
    label: "Data and backend",
    query: "topic:database stars:>1000",
    reason: "Data/backend projects create hosting, migration, compliance, and observability opportunities.",
  },
  {
    category: "frontend",
    label: "Frontend stack",
    query: "topic:frontend stars:>1000",
    reason: "Frontend ecosystems expose adoption, migration, template, and training opportunities.",
  },
  {
    category: "observability",
    label: "Observability",
    query: "topic:observability stars:>1000",
    reason: "Observability tools are commercially validated and often need focused vertical wrappers.",
  },
];

type GitHubSearchItem = {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  language?: string | null;
  pushed_at?: string;
  archived?: boolean;
  fork?: boolean;
};

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "StackSignal-App",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function recentDate(daysBack: number) {
  const date = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export async function discoverTopStackRepos(limit = 5): Promise<DiscoveredRepo[]> {
  const since = recentDate(120);
  const selected: DiscoveredRepo[] = [];
  const seen = new Set<string>();

  for (const search of STACK_SEARCHES.slice(0, limit)) {
    const q = `${search.query} pushed:>=${since} archived:false fork:false`;
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", q);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", "8");

    const response = await fetch(url.toString(), { headers: githubHeaders() });
    if (!response.ok) {
      throw new Error(`GitHub discovery failed for ${search.label}: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { items?: GitHubSearchItem[] };
    const repo = data.items?.find((item) => item.full_name && !item.archived && !item.fork && !seen.has(item.full_name.toLowerCase()));
    if (!repo?.full_name || !repo.html_url) continue;

    seen.add(repo.full_name.toLowerCase());
    selected.push({
      category: search.category,
      categoryLabel: search.label,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description ?? "",
      stars: repo.stargazers_count ?? 0,
      language: repo.language ?? "Unknown",
      pushedAt: repo.pushed_at ?? "",
      reason: search.reason,
    });
  }

  return selected;
}
