import prisma from '../prisma';

export interface GitHubSignals {
  name: string
  stars: number
  forks: number
  openIssues: number
  language: string
  description: string
  isArchived: boolean
  lastCommitDays: number
  starsLast30d: number
  velocityTrend: "accelerating" | "stable" | "declining"
  hostingRequestsLast90d: number
  enterpriseRequestsLast90d: number
  skipSignalsFound: string[]
  topHostingIssues: string[]
  topEnterpriseIssues: string[]
}

export interface SignalError {
  error: true
  message: string
  code: "NOT_FOUND" | "RATE_LIMITED" | "INVALID_URL" | "UNKNOWN"
}

export async function fetchGitHubSignals(repoUrl: string): Promise<GitHubSignals | SignalError> {
  try {
    // 2. Parse ANY GitHub URL format
    let cleanUrl = repoUrl.trim();
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
    if (cleanUrl.endsWith('.git')) cleanUrl = cleanUrl.slice(0, -4);

    const parts = cleanUrl.split('/');
    if (parts.length < 2) {
      return { error: true, message: "Invalid GitHub URL format", code: "INVALID_URL" };
    }
    
    const repo = parts.pop()!;
    const owner = parts.pop()!;

    if (!owner || !repo || owner.includes('github.com')) {
      return { error: true, message: "Invalid GitHub URL format", code: "INVALID_URL" };
    }

    const identifier = `${owner}/${repo}`.toLowerCase();

    // 6. Caching
    try {
      const cached = await prisma.signalTarget.findUnique({
        where: {
          type_identifier: {
            type: "GITHUB_REPO",
            identifier
          }
        }
      });

      if (cached && cached.lastFetched && cached.signalData) {
        const hoursSince = (Date.now() - cached.lastFetched.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          const data = cached.signalData as any;
          // Handle aggregate signals if saved by the API route
          if (data.github && !data.error) {
            return data.github as GitHubSignals;
          }
          return data as GitHubSignals;
        }
      }
    } catch (err) {
      console.warn("DB Cache read failed, proceeding to fetch.");
    }

    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "StackSignal-App"
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const date90DaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 3. Fetch these IN PARALLEL using Promise.all
    const [repoRes, issues90Res, issues30Res, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&since=${date90DaysAgo}&per_page=100`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&since=${date30DaysAgo}&per_page=100`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers })
    ]);

    if (repoRes.status === 404) return { error: true, message: "Repository not found", code: "NOT_FOUND" };
    if (repoRes.status === 403 || repoRes.status === 429) return { error: true, message: "Rate limited by GitHub API", code: "RATE_LIMITED" };
    if (!repoRes.ok) return { error: true, message: `GitHub API error: ${repoRes.statusText}`, code: "UNKNOWN" };

    const repoData = await repoRes.json();
    const issues90d = issues90Res.ok ? await issues90Res.json() : [];
    const issues30d = issues30Res.ok ? await issues30Res.json() : [];
    const commits = commitsRes.ok ? await commitsRes.json() : [];

    let lastCommitDays = 0;
    if (Array.isArray(commits) && commits.length > 0 && commits[0].commit?.author?.date) {
      const lastCommitDate = new Date(commits[0].commit.author.date);
      lastCommitDays = Math.floor((Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 4. Classify issues by keywords
    const HOSTING_KEYWORDS = ["host", "managed", "saas", "cloud", "deploy", "service", "hosted", "self-host"];
    const ENTERPRISE_KEYWORDS = ["sso", "rbac", "audit", "enterprise", "compliance", "soc2", "hipaa", "gdpr", "saml"];
    const SKIP_SIGNAL_KEYWORDS = ["deprecated", "archived", "unmaintained", "shutting down", "sunset"];

    let hostingRequestsLast90d = 0;
    let enterpriseRequestsLast90d = 0;
    const skipSignalsFound = new Set<string>();
    const topHostingIssues: string[] = [];
    const topEnterpriseIssues: string[] = [];

    if (Array.isArray(issues90d)) {
      for (const issue of issues90d) {
        const text = `${issue.title || ""} ${issue.body || ""}`.toLowerCase();
        let isHosting = false;
        for (const kw of HOSTING_KEYWORDS) {
          if (text.includes(kw)) {
            isHosting = true;
            hostingRequestsLast90d++;
            break;
          }
        }

        let isEnterprise = false;
        for (const kw of ENTERPRISE_KEYWORDS) {
          if (text.includes(kw)) {
            isEnterprise = true;
            enterpriseRequestsLast90d++;
            break;
          }
        }

        if (isHosting && topHostingIssues.length < 5) topHostingIssues.push(issue.html_url);
        if (isEnterprise && topEnterpriseIssues.length < 5) topEnterpriseIssues.push(issue.html_url);
      }
    }

    // NEW: Use Search API for more accurate counts across ALL issues (not just a sample of 100)
    try {
      const hostingQuery = encodeURIComponent(`repo:${owner}/${repo} is:issue ${HOSTING_KEYWORDS.join(' OR ')} created:>=${date90DaysAgo.split('T')[0]}`);
      const enterpriseQuery = encodeURIComponent(`repo:${owner}/${repo} is:issue ${ENTERPRISE_KEYWORDS.join(' OR ')} created:>=${date90DaysAgo.split('T')[0]}`);

      const [hostingSearchRes, enterpriseSearchRes] = await Promise.all([
        fetch(`https://api.github.com/search/issues?q=${hostingQuery}&per_page=1`, { headers }),
        fetch(`https://api.github.com/search/issues?q=${enterpriseQuery}&per_page=1`, { headers })
      ]);

      if (hostingSearchRes.ok) {
        const data = await hostingSearchRes.json();
        if (data.total_count > hostingRequestsLast90d) {
          hostingRequestsLast90d = data.total_count;
        }
      }

      if (enterpriseSearchRes.ok) {
        const data = await enterpriseSearchRes.json();
        if (data.total_count > enterpriseRequestsLast90d) {
          enterpriseRequestsLast90d = data.total_count;
        }
      }
    } catch (err) {
      console.warn("GitHub Search API failed, falling back to sample count.");
    }

    if (repoData.description) {
      const desc = repoData.description.toLowerCase();
      // Only flag if the description starts with the keyword or contains "is deprecated", etc.
      for (const kw of SKIP_SIGNAL_KEYWORDS) {
        const patterns = [
          `this project is ${kw}`,
          `is now ${kw}`,
          `[${kw}]`,
          `${kw}:`
        ];
        if (desc.startsWith(kw) || patterns.some(p => desc.includes(p))) {
          skipSignalsFound.add(kw);
        }
      }
    }

    // 9. velocityTrend calculation
    // "Estimate prior 30 days as: starsLast30d × 0.9"
    // Since we don't have true starsLast30d from GitHub API directly, we use 5% of total stars as an estimate
    const starsLast30d = Math.round(repoData.stargazers_count * 0.05);
    const prior30DaysStars = starsLast30d * 0.9;
    
    let velocityTrend: "accelerating" | "stable" | "declining" = "stable";
    if (starsLast30d > prior30DaysStars * 1.2) {
      velocityTrend = "accelerating";
    } else if (starsLast30d < prior30DaysStars * 0.8) {
      velocityTrend = "declining";
    }

    const result: GitHubSignals = {
      name: repoData.full_name,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      language: repoData.language || "Unknown",
      description: repoData.description || "",
      isArchived: repoData.archived === true,
      lastCommitDays,
      starsLast30d,
      velocityTrend,
      hostingRequestsLast90d,
      enterpriseRequestsLast90d,
      skipSignalsFound: Array.from(skipSignalsFound),
      topHostingIssues,
      topEnterpriseIssues,
    };
    try {
      await prisma.signalTarget.upsert({
        where: {
          type_identifier: {
            type: "GITHUB_REPO",
            identifier
          }
        },
        update: {
          displayName: result.name,
          signalData: result as any,
          lastFetched: new Date()
        },
        create: {
          type: "GITHUB_REPO",
          identifier,
          displayName: result.name,
          signalData: result as any,
          lastFetched: new Date()
        }
      });
    } catch (err) {
      console.warn("DB Cache write failed.");
    }

    return result;
  } catch (error: any) {
    // 7. NEVER throw errors.
    return { error: true, message: error.message || "Unknown error", code: "UNKNOWN" };
  }
}
