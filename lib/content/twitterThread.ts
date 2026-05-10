/**
 * Twitter/X Thread Generator
 * 
 * Converts a StackSignal analysis verdict into a shareable
 * Twitter thread format. Used by the daily cron for automated
 * content distribution.
 */

type ThreadInput = {
  targetName: string;
  verdict: "BUILD" | "SKIP" | "WATCH";
  confidence: number;
  reasoning: string;
  scores: {
    demand?: number;
    crowdedness?: number;
    wtp?: number;
    moat?: number;
    platformRisk?: number;
  };
  skipReasons?: Array<{ ideaName: string; reason: string }>;
  bestIdea?: {
    name: string;
    oneLiner: string;
    category?: string;
    roughPricing?: string;
  };
  reportUrl: string;
};

export function generateThread(input: ThreadInput): string[] {
  const { targetName, verdict, confidence, reasoning, scores, skipReasons, bestIdea, reportUrl } = input;

  const thread: string[] = [];

  // Tweet 1: Hook
  if (verdict === "SKIP") {
    thread.push(
      `🔴 SKIP SIGNAL: ${targetName}\n\n` +
      `We analyzed the ecosystem signals.\n` +
      `Verdict: SKIP (${confidence}/10 confidence)\n\n` +
      `Here's why you should NOT build in this space 🧵👇`
    );
  } else if (verdict === "BUILD") {
    thread.push(
      `🟢 BUILD SIGNAL: ${targetName}\n\n` +
      `Our signal analysis found a genuine opportunity.\n` +
      `Verdict: BUILD (${confidence}/10 confidence)\n\n` +
      `Here's the data behind the decision 🧵👇`
    );
  } else {
    thread.push(
      `🟡 WATCH SIGNAL: ${targetName}\n\n` +
      `Interesting ecosystem signals detected. Not ready yet.\n` +
      `Verdict: WATCH (${confidence}/10 confidence)\n\n` +
      `Here's what we're tracking 🧵👇`
    );
  }

  // Tweet 2: Signal Scores
  const scoreLines: string[] = [];
  if (scores.demand !== undefined) scoreLines.push(`📊 Demand: ${scores.demand.toFixed(1)}/10`);
  if (scores.crowdedness !== undefined) scoreLines.push(`👥 Crowdedness: ${scores.crowdedness.toFixed(1)}/10`);
  if (scores.wtp !== undefined) scoreLines.push(`💰 Willingness to Pay: ${scores.wtp.toFixed(1)}/10`);
  if (scores.moat !== undefined) scoreLines.push(`🏰 Moat Potential: ${scores.moat.toFixed(1)}/10`);
  if (scores.platformRisk !== undefined) scoreLines.push(`⚠️ Platform Risk: ${scores.platformRisk.toFixed(1)}/10`);

  thread.push(
    `Signal Scores for ${targetName}:\n\n` +
    scoreLines.join("\n") +
    `\n\nData from GitHub, npm, and market intelligence.`
  );

  // Tweet 3: Reasoning
  const truncatedReasoning = reasoning.length > 240
    ? reasoning.substring(0, 237) + "..."
    : reasoning;

  thread.push(
    `The analysis:\n\n` +
    `"${truncatedReasoning}"`
  );

  // Tweet 4: Skip Reasons or Best Idea
  if (verdict === "SKIP" && skipReasons && skipReasons.length > 0) {
    const reasons = skipReasons
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.reason}`)
      .join("\n");

    thread.push(
      `Why SKIP:\n\n` +
      reasons +
      `\n\nSave yourself 6 months of building the wrong thing.`
    );
  } else if (verdict === "BUILD" && bestIdea) {
    thread.push(
      `Best opportunity found:\n\n` +
      `"${bestIdea.name}"\n` +
      `${bestIdea.oneLiner}\n\n` +
      (bestIdea.roughPricing ? `💵 Pricing: ${bestIdea.roughPricing}\n` : "") +
      (bestIdea.category ? `📂 Category: ${bestIdea.category}` : "")
    );
  }

  // Tweet 5: CTA
  thread.push(
    `Full report with validation plan, MVP scope, and skip analysis:\n\n` +
    `${reportUrl}\n\n` +
    `🔔 Get the weekly "3 Things NOT to Build" newsletter:\n` +
    `stacksignal.com\n\n` +
    `#buildinpublic #startups #founderlife`
  );

  return thread;
}

/**
 * Format thread for copying (numbered tweets)
 */
export function formatThreadForCopy(thread: string[]): string {
  return thread
    .map((tweet, i) => `--- Tweet ${i + 1}/${thread.length} ---\n${tweet}\n(${tweet.length} chars)`)
    .join("\n\n");
}

/**
 * Generate a single-tweet summary for quick sharing
 */
export function generateSingleTweet(input: ThreadInput): string {
  const emoji = input.verdict === "SKIP" ? "🔴" : input.verdict === "BUILD" ? "🟢" : "🟡";
  const truncatedReasoning = input.reasoning.length > 160
    ? input.reasoning.substring(0, 157) + "..."
    : input.reasoning;

  return (
    `${emoji} ${input.verdict}: ${input.targetName}\n\n` +
    `${truncatedReasoning}\n\n` +
    `Full report: ${input.reportUrl}\n\n` +
    `#stacksignal`
  );
}
