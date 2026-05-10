import { calculateSignalScore } from "../lib/scoring/signals";

const mockSignals = {
  stars: 244000,
  forks: 40000,
  openIssues: 1000,
  lastCommitDays: 1,
  velocityTrend: "accelerating" as const,
  hostingRequestsLast90d: 150,
  enterpriseRequestsLast90d: 60,
  crowdednessScore: 5
};

const score = calculateSignalScore(mockSignals);
console.log("Score:", score);
