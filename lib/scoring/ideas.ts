export interface IdeaDimensions {
  demand: number;
  founderFit: number;
  crowdedness: number;
  wtp: number;
  gtmFit: number;
  buildComplexity: number;
  speedToRevenue: number;
  moat: number;
  platformRisk: number;
}

export interface IdeaScores {
  composite: number;
  verdict: "BUILD" | "WATCH" | "SKIP";
}

export function scoreIdea(idea: any, signals: IdeaDimensions, founderProfile?: any): IdeaScores {
  const {
    demand, founderFit, crowdedness, wtp,
    gtmFit, buildComplexity, speedToRevenue,
    moat, platformRisk
  } = signals;

  const compositeRaw = 
    demand * 0.20 +
    founderFit * 0.15 +
    crowdedness * 0.15 +
    wtp * 0.15 +
    gtmFit * 0.10 +
    buildComplexity * 0.10 +
    speedToRevenue * 0.10 +
    moat * 0.05 +
    platformRisk * 0.00;

  const composite = Math.round(compositeRaw * 10) / 10;

  let verdict: "BUILD" | "WATCH" | "SKIP";

  if (crowdedness < 3 || platformRisk > 8) {
    verdict = "SKIP";
  } else if (composite >= 7.0 && crowdedness >= 5) {
    verdict = "BUILD";
  } else {
    verdict = "WATCH";
  }

  return {
    composite,
    verdict
  };
}
