import prisma from "@/lib/prisma";

export interface TrendingRepo {
  fullName: string;
  name: string;
  owner: string;
  stars: number;
  description: string;
  language: string;
  url: string;
  topics: string[];
}

type GitHubRepoItem = {
  full_name?: string;
  name?: string;
  owner?: { login?: string };
  stargazers_count?: number;
  description?: string | null;
  language?: string | null;
  html_url?: string;
  topics?: string[];
  archived?: boolean;
  fork?: boolean;
};

type UnofficialTrendingItem = {
  username?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  description?: string;
  totalStars?: number;
  language?: string;
  builtBy?: unknown[];
};

function isoDateDaysAgo(days: number) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "StackSignal-App",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function normalizeGitHubRepo(item: GitHubRepoItem): TrendingRepo | null {
  if (!item.full_name || !item.name || !item.owner?.login || !item.html_url) return null;
  if (item.archived || item.fork) return null;

  return {
    fullName: item.full_name,
    name: item.name,
    owner: item.owner.login,
    stars: item.stargazers_count ?? 0,
    description: item.description ?? "",
    language: item.language ?? "Unknown",
    url: item.html_url,
    topics: item.topics ?? [],
  };
}

function normalizeUnofficialRepo(item: UnofficialTrendingItem): TrendingRepo | null {
  if (!item.username || !item.repositoryName) return null;
  const fullName = `${item.username}/${item.repositoryName}`;

  return {
    fullName,
    name: item.repositoryName,
    owner: item.username,
    stars: item.totalStars ?? 0,
    description: item.description ?? "",
    language: item.language ?? "Unknown",
    url: item.repositoryUrl ?? `https://github.com/${fullName}`,
    topics: [],
  };
}

async function fetchGitHubSearch(query: string, perPage: number): Promise<TrendingRepo[]> {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(perPage));

  const response = await fetch(url.toString(), { headers: githubHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub Search API failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { items?: GitHubRepoItem[] };
  return (data.items ?? []).map(normalizeGitHubRepo).filter((repo): repo is TrendingRepo => Boolean(repo));
}

async function fetchUnofficialTrending(): Promise<TrendingRepo[]> {
  const response = await fetch("https://api.gitterapp.com/repositories?language=&since=daily");
  if (!response.ok) {
    throw new Error(`Unofficial trending API failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as UnofficialTrendingItem[];
  return data.map(normalizeUnofficialRepo).filter((repo): repo is TrendingRepo => Boolean(repo));
}

async function removeRecentlyAnalyzed(repos: TrendingRepo[]) {
  const identifiers = repos.map((repo) => repo.fullName.toLowerCase());
  const recentTargets = await prisma.signalTarget.findMany({
    where: {
      type: "GITHUB_REPO",
      identifier: { in: identifiers },
      lastFetched: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    select: { identifier: true },
  });

  const recent = new Set(recentTargets.map((target) => target.identifier.toLowerCase()));
  return repos.filter((repo) => !recent.has(repo.fullName.toLowerCase()));
}

export async function fetchTrendingRepos(): Promise<TrendingRepo[]> {
  const recentHighVelocity = await fetchGitHubSearch(`stars:>500 pushed:>${isoDateDaysAgo(30)}`, 30);

  let dailyTrending: TrendingRepo[];
  try {
    dailyTrending = await fetchUnofficialTrending();
  } catch (error) {
    console.warn("[trending] Unofficial trending failed; using GitHub fallback", error);
    dailyTrending = await fetchGitHubSearch(`created:>${isoDateDaysAgo(7)} stars:>100`, 20);
  }

  const deduped = new Map<string, TrendingRepo>();
  for (const repo of [...dailyTrending, ...recentHighVelocity]) {
    if (repo.stars < 200) continue;
    const key = repo.fullName.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, repo);
  }

  const candidates = Array.from(deduped.values()).sort((a, b) => b.stars - a.stars);
  const fresh = await removeRecentlyAnalyzed(candidates);
  return fresh.slice(0, 20);
}
