export interface SignalMetrics {
  weeklyDownloads?: number;
  stars?: number;
  hostingRequestsLast90d?: number;
  enterpriseRequestsLast90d?: number;
  unsolvedPosts?: number;
  crowdednessScore?: number;
  lastCommitDays?: number;
  velocityTrend?: "accelerating" | "stable" | "declining";
  skipSignalsFound?: string[];
  isArchived?: boolean;
}

export function calculateSignalScore(signals: SignalMetrics): { total: number; breakdown: Record<string, number> } {
  let sum = 0;
  const breakdown: Record<string, number> = {};

  // TIER 1 — Production proof (max 4pts):
  let tier1Score = 0;
  if (signals.weeklyDownloads !== undefined) {
    if (signals.weeklyDownloads > 1000000) {
      tier1Score += 2;
    } else if (signals.weeklyDownloads > 100000) {
      tier1Score += 1;
    }
  }

  if (signals.stars !== undefined) {
    if (signals.stars > 10000) {
      tier1Score += 2;
    } else if (signals.stars > 1000) {
      tier1Score += 1;
    }
  }
  const actualTier1 = Math.min(4, tier1Score);
  sum += actualTier1;
  breakdown['tier1'] = actualTier1;

  // TIER 2 — Demand proof (max 4pts):
  let tier2Score = 0;
  if (signals.hostingRequestsLast90d !== undefined && signals.hostingRequestsLast90d > 100) {
    tier2Score += 1;
  }
  if (signals.enterpriseRequestsLast90d !== undefined && signals.enterpriseRequestsLast90d > 50) {
    tier2Score += 1;
  }
  if (signals.unsolvedPosts !== undefined) {
    if (signals.unsolvedPosts > 10) {
      tier2Score += 1;
    } else if (signals.unsolvedPosts > 3) {
      tier2Score += 0.5;
    }
  }
  const actualTier2 = Math.min(4, tier2Score);
  sum += actualTier2;
  breakdown['tier2'] = actualTier2;

  // TIER 3 — Competition gap (max 2pts):
  let tier3Score = 0;
  if (signals.crowdednessScore !== undefined) {
    if (signals.crowdednessScore < 3) {
      tier3Score += 2;
    } else if (signals.crowdednessScore < 6) {
      tier3Score += 1;
    }
  }
  const actualTier3 = Math.min(2, tier3Score);
  sum += actualTier3;
  breakdown['tier3'] = actualTier3;

  // TIER 4 — Health signals (max 2pts):
  let tier4Score = 0;
  if (signals.lastCommitDays !== undefined && signals.lastCommitDays < 30) {
    tier4Score += 1;
  }
  if (signals.velocityTrend === "accelerating") {
    tier4Score += 1;
  }
  const actualTier4 = Math.min(2, tier4Score);
  sum += actualTier4;
  breakdown['tier4'] = actualTier4;

  // SKIP signals (reduce score):
  if (signals.skipSignalsFound !== undefined && signals.skipSignalsFound.length > 0) {
    sum -= 3;
    breakdown['skipSignals'] = -3;
  }
  
  let total = Math.min(12, sum);

  if (signals.isArchived === true) {
    total = 0;
    breakdown['isArchived'] = 0;
  }

  const result = {
    total: Math.round(total * 10) / 10,
    breakdown
  };

  console.log(`[calculateSignalScore]`, {
    total: result.total,
    breakdown: result.breakdown,
    inputMetrics: {
      stars: signals.stars,
      isArchived: signals.isArchived,
      hosting: signals.hostingRequestsLast90d,
      downloads: signals.weeklyDownloads
    }
  });

  return result;
}
