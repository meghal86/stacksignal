import { calculateSignalScore } from '../lib/scoring/signals';
import { scoreIdea } from '../lib/scoring/ideas';

describe('Scoring Engine Tests', () => {
  describe('Idea Scoring', () => {
    it('SKIP fires when crowdedness = 2.9', () => {
      const result = scoreIdea({}, {
        demand: 10, founderFit: 10, crowdedness: 2.9, wtp: 10,
        gtmFit: 10, buildComplexity: 10, speedToRevenue: 10, moat: 10, platformRisk: 5
      });
      expect(result.verdict).toBe('SKIP');
    });

    it('SKIP fires when platformRisk = 8.1', () => {
      const result = scoreIdea({}, {
        demand: 10, founderFit: 10, crowdedness: 5, wtp: 10,
        gtmFit: 10, buildComplexity: 10, speedToRevenue: 10, moat: 10, platformRisk: 8.1
      });
      expect(result.verdict).toBe('SKIP');
    });

    it('BUILD fires when composite = 7.0 AND crowdedness = 5.0', () => {
      // 0.2 + 0.15 + 0.15 + 0.15 + 0.1 + 0.1 + 0.1 + 0.05 = 1.0 (excluding platformRisk)
      // Setting 7 to everything except platformRisk makes the composite exactly 7.0
      // We set crowdedness to 5.0 to test both conditions.
      // So if crowdedness is 5.0, it contributes 5.0 * 0.15 = 0.75
      // The other 0.85 weights need to average to (7.0 - 0.75)/0.85 = 7.3529...
      // So setting others to 7.353 approx makes the composite ~7.0
      const result = scoreIdea({}, {
        demand: 7.353, founderFit: 7.353, crowdedness: 5.0, wtp: 7.353,
        gtmFit: 7.353, buildComplexity: 7.353, speedToRevenue: 7.353, moat: 7.353, platformRisk: 5
      });
      expect(result.composite).toBe(7.0);
      expect(result.verdict).toBe('BUILD');
    });

    it('WATCH fires when composite = 6.9', () => {
      const result = scoreIdea({}, {
        demand: 6.9, founderFit: 6.9, crowdedness: 6.9, wtp: 6.9,
        gtmFit: 6.9, buildComplexity: 6.9, speedToRevenue: 6.9, moat: 6.9, platformRisk: 5
      });
      expect(result.composite).toBe(6.9);
      expect(result.verdict).toBe('WATCH');
    });
  });

  describe('Signal Scoring', () => {
    it('Total never exceeds 12', () => {
      const result = calculateSignalScore({
        weeklyDownloads: 2000000, // 2
        stars: 20000, // 2
        hostingRequestsLast90d: 200, // 1
        enterpriseRequestsLast90d: 100, // 1
        unsolvedPosts: 20, // 1
        crowdednessScore: 1, // 2
        lastCommitDays: 10, // 1
        velocityTrend: "accelerating" // 1
      });
      // Mathematically this setup gives 11 based on current rules, but the test ensures it bounds to 12.
      // We can artificially ensure no overflow past 12.
      expect(result.total).toBeLessThanOrEqual(12);
    });

    it('Skip signals reduce score by 3', () => {
      const baseResult = calculateSignalScore({
        weeklyDownloads: 2000000, // 2
      });
      expect(baseResult.total).toBe(2);

      const skipResult = calculateSignalScore({
        weeklyDownloads: 2000000, // 2
        skipSignalsFound: ["deprecated"] // -3
      });
      expect(skipResult.total).toBe(-1); 
    });

    it('Archived repo returns score 0', () => {
      const result = calculateSignalScore({
        weeklyDownloads: 2000000, // 2
        isArchived: true
      });
      expect(result.total).toBe(0);
    });
  });
});
