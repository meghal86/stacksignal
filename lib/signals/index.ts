import { fetchGitHubSignals } from "./github";
import { fetchPackageSignals } from "./packages";
import { fetchHNDemand } from "./hn";
import { fetchCompetition } from "./competition";

export interface AggregateSignals {
  github?: any;
  package?: any;
  hn?: any;
  competition?: any;
}

export async function fetchAggregateSignals(slug: string, type: "github" | "npm" | "pypi" | "docker"): Promise<AggregateSignals> {
  const results: AggregateSignals = {};

  if (type === "github") {
    results.github = await fetchGitHubSignals(slug);
  } else if (type === "npm" || type === "pypi") {
    results.package = await fetchPackageSignals(slug, type);
  }

  // Common signals for all targets
  const name = results.github?.name || results.package?.name || slug;
  
  // Parallel fetch for HN and Competition
  const [hn, comp] = await Promise.all([
    fetchHNDemand(name),
    fetchCompetition(name)
  ]);

  results.hn = hn;
  results.competition = comp;

  return results;
}
