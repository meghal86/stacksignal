import { GoogleGenerativeAI } from "@google/generative-ai"
import { DECISION_PROMPT } from "./prompts"
import { TopIdea } from "./opportunityEngine"
import { IdeaDimensions, IdeaScores, scoreIdea } from "../scoring/ideas"


export interface Decision {
  bestIdea: TopIdea
  verdict: "BUILD" | "WATCH" | "SKIP"
  confidence: number
  reasoning: string
  scores: IdeaDimensions & { composite: number }
  skipReasons: { ideaName: string; reason: string }[]
  validationPlan: { day: number; action: string; goal: string; successSignal: string }[]
  mvpScope: { coreFeatures: string[]; excludedFeatures: string[]; firstCustomerPath: string }
  founderAdvantage: string | null
  founderWarning: string | null
  overrideNote?: string
}

export async function generateDecision(params: {
  topIdeas: TopIdea[]
  signalScore: any
  founderProfile?: any
}): Promise<Decision> {
  if (process.env.MOCK_LLM === "true") {
    console.log("[decisionEngine] Using MOCK_LLM mode");
    const bestIdea = params.topIdeas[0];
    return {
      bestIdea,
      verdict: "BUILD",
      confidence: 0.85,
      reasoning: "The signal metrics indicate high demand and low competition for a managed hosting solution in this ecosystem.",
      scores: {
        demand: 8,
        founderFit: 7,
        crowdedness: 2,
        wtp: 9,
        gtmFit: 7,
        buildComplexity: 5,
        speedToRevenue: 8,
        moat: 6,
        platformRisk: 4,
        composite: 7.5
      },
      skipReasons: [],
      validationPlan: [
        { day: 1, action: "Set up landing page", goal: "Collect 50 emails", successSignal: "5% conversion rate" },
        { day: 3, action: "Interview 5 users", goal: "Identify top 3 pain points", successSignal: "Consistent feedback" }
      ],
      mvpScope: {
        coreFeatures: ["Deployment dashboard", "Auto-scaling", "SSL management"],
        excludedFeatures: ["Team collaboration", "Advanced analytics"],
        firstCustomerPath: "Direct outreach to top GitHub contributors"
      },
      founderAdvantage: "Your background matches the technical requirements.",
      founderWarning: null
    };
  }

  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
  const model = genai.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  })

  const topIdeasStr = JSON.stringify(params.topIdeas, null, 2)
  const signalScoresStr = JSON.stringify(params.signalScore, null, 2)
  const founderProfileStr = params.founderProfile
    ? JSON.stringify(params.founderProfile, null, 2)
    : "No profile provided"

  const prompt = DECISION_PROMPT
    .replace("{TOP_IDEAS}", topIdeasStr)
    .replace("{SIGNAL_SCORES}", signalScoresStr)
    .replace("{FOUNDER_PROFILE}", founderProfileStr)

  let attempt = 0;
  while (attempt < 3) {
    try {
      const result = await model.generateContent(prompt)
      let text = result.response.text()
      // Strip markdown fences
      text = text.replace(/```json/g, "").replace(/```/g, "").trim()
      
      console.log(`[generateDecision] Raw LLM Text:`, text);
      const decision: Decision = JSON.parse(text)
      console.log(`[generateDecision] Parsed Decision Verdict:`, decision.verdict);
      
      // Re-calculate and validate using our scoring engine
      const trueScores = scoreIdea(decision.bestIdea, decision.scores, params.founderProfile)
      
      // Override rules
      if (decision.verdict === "BUILD" && trueScores.composite < 7.0) {
        decision.verdict = "WATCH"
        decision.overrideNote = "Score override applied"
      }
      
      if (decision.verdict === "BUILD" && decision.scores.crowdedness < 3) {
        decision.verdict = "SKIP"
        decision.overrideNote = "Crowdedness override applied"
      }

      // Trust the scoring engine over Gemini for verdict thresholds
      if (trueScores.verdict === "SKIP") {
          decision.verdict = "SKIP"
          decision.overrideNote = decision.overrideNote || "Scoring engine override to SKIP applied"
      }

      return decision
    } catch (e: any) {
      attempt++
      console.error("Failed to parse decision attempt", attempt, e)

      // Check for 429 Rate Limit
      if (e?.message?.includes("429") || e?.status === 429) {
        console.warn("Gemini Rate Limit hit. Waiting 5s...");
        await new Promise(r => setTimeout(r, 5000));
      }

      if (attempt >= 3) {
        throw new Error(`Failed to parse decision: ${e.message}`)
      }
    }
  }

  throw new Error("Failed to parse decision")
}

export async function streamDecision(params: {
  topIdeas: TopIdea[]
  signalScores: any
  founderProfile?: any
}) {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
  const model = genai.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  })

  const topIdeasStr = JSON.stringify(params.topIdeas, null, 2)
  const signalScoresStr = JSON.stringify(params.signalScores, null, 2)
  const founderProfileStr = params.founderProfile
    ? JSON.stringify(params.founderProfile, null, 2)
    : "No profile provided"

  const prompt = DECISION_PROMPT
    .replace("{TOP_IDEAS}", topIdeasStr)
    .replace("{SIGNAL_SCORES}", signalScoresStr)
    .replace("{FOUNDER_PROFILE}", founderProfileStr)

  const result = await model.generateContentStream(prompt)
  return result.stream
}
