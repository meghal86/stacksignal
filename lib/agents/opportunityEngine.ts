import { GoogleGenerativeAI } from "@google/generative-ai"
import { OPPORTUNITY_PROMPT } from "./prompts"
import { GitHubSignals } from "../signals/github"
import { PackageSignals } from "../signals/packages"
import { HNSignals } from "../signals/hn"


export interface TopIdea {
  rank: number
  name: string
  category: "managed_hosting" | "analytics_layer" | "compliance_wrapper" | "migration_toolkit" | "marketplace_plugins" | "vertical_saas" | "api_wrapper" | "developer_tools" | "training_cert"
  oneLiner: string
  signalEvidence: string[]
  targetCustomer: string
  roughPricing: string
  buildWeeks: number
  skipRisk: string

  marketGap?: string
  pricingTiers?: Array<{ name: string; price: string; description: string }>
  revenueEstimate?: string
  competition?: Array<{ name: string; price: string; weakness: string }>
  buildNotes?: string
  claudePrompts?: Array<{ title: string; prompt: string }>
  firstCustomerPath?: string
  outreachTemplate?: string

  narrative?: string
  whyNow?: {
    score: number
    factors: Array<{ name: string; score: number; explanation: string }>
  }
  scores?: {
    opportunity?: { score: number; summary: string; breakdown?: Record<string, number> }
    problem?: {
      score: number
      painType?: "Acute" | "Chronic" | "Latent"
      trend?: "Increasing" | "Stable" | "Decreasing"
      keyPainPoints?: string[]
      marketEvidence?: Array<{ source: string; evidence: string }>
    }
    feasibility?: { score: number; complexity: string; summary: string }
    whyNow?: { score: number; summary: string }
  }
  businessFit?: {
    revenuePotential?: {
      tier: "$" | "$$" | "$$$"
      arrEstimate: string
      revenueExamples?: string[]
      businessModels?: string[]
      exampleCompanies?: string[]
    }
    executionDifficulty?: number
    gtmFit?: number
  }
  categorization?: {
    type?: string
    market?: string
    targetCustomer?: string
    mainCompetitors?: string[]
  }
  skipRisks?: Array<{ severity: "HIGH" | "MEDIUM" | "LOW"; risk: string }>
  communitySignals?: {
    reddit?: string
    hackerNews?: string
    github?: string
    twitter?: string
  }
}

export async function generateTopIdeas(params: {
  signals: {
    github?: GitHubSignals
    package?: PackageSignals
    hn?: HNSignals
    competition?: any
  }
  founderProfile?: {
    background: string[]
    industries: string[]
    timeline: string
  }
}): Promise<TopIdea[]> {
  if (process.env.MOCK_LLM === "true") {
    console.log("[opportunityEngine] Using MOCK_LLM mode");
    return [
      {
        rank: 1,
        name: "Managed Hosting for " + (params.signals.github?.name || "Target"),
        category: "managed_hosting",
        oneLiner: "Secure, scalable managed infrastructure for high-growth teams.",
        signalEvidence: ["High GitHub stars", "Active issues requesting hosting"],
        targetCustomer: "Series A startups",
        roughPricing: "$499/mo",
        buildWeeks: 4,
        skipRisk: "Low"
      },
      {
        rank: 2,
        name: "Enterprise Compliance Wrapper",
        category: "compliance_wrapper",
        oneLiner: "Add SOC2 and HIPAA compliance to the stack instantly.",
        signalEvidence: ["Enterprise-related issues found"],
        targetCustomer: "Fintech and Healthcare companies",
        roughPricing: "$2000/mo",
        buildWeeks: 6,
        skipRisk: "Medium"
      },
      {
        rank: 3,
        name: "Analytics & Monitoring Layer",
        category: "analytics_layer",
        oneLiner: "Deep visibility into usage patterns and performance metrics.",
        signalEvidence: ["Usage growing fast", "Demand for better monitoring"],
        targetCustomer: "DevOps teams",
        roughPricing: "$99/mo",
        buildWeeks: 3,
        skipRisk: "Low"
      },
      {
        rank: 4,
        name: "Developer Certification Course",
        category: "training_cert",
        oneLiner: "Become an expert in this ecosystem with our certified path.",
        signalEvidence: ["High complexity", "Large talent gap"],
        targetCustomer: "Individual developers",
        roughPricing: "$499 one-time",
        buildWeeks: 2,
        skipRisk: "Low"
      },
      {
        rank: 5,
        name: "Migration Toolkit",
        category: "migration_toolkit",
        oneLiner: "Zero-downtime migrations from legacy alternatives.",
        signalEvidence: ["Search volume for migrations", "High friction in onboarding"],
        targetCustomer: "Enterprise IT",
        roughPricing: "$5000 per project",
        buildWeeks: 5,
        skipRisk: "High"
      }
    ];
  }

  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
  const model = genai.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  })

  const signalSummary = JSON.stringify(params.signals, null, 2)
  const founderProfileStr = params.founderProfile
    ? JSON.stringify(params.founderProfile, null, 2)
    : "No profile provided — give general advice"

  const prompt = OPPORTUNITY_PROMPT
    .replace("{SIGNAL_DATA}", signalSummary)
    .replace("{FOUNDER_PROFILE}", founderProfileStr)

  let attempt = 0;
  let text = "";
  while (attempt < 3) {
    try {
      const result = await model.generateContent(prompt)
      text = result.response.text()

      // Strip markdown fences if present
      text = text.replace(/```json/g, "").replace(/```/g, "").trim()

      const ideas = JSON.parse(text)
      
      if (!Array.isArray(ideas) || ideas.length !== 5) {
        throw new Error("Result is not an array of exactly 5 ideas")
      }
      
      return ideas as TopIdea[]
    } catch (e: any) {
      attempt++
      console.error("Failed to parse ideas attempt", attempt, e)
      
      // Check for 429 Rate Limit
      if (e?.message?.includes("429") || e?.status === 429) {
        console.warn("Gemini Rate Limit hit. Waiting 5s...");
        await new Promise(r => setTimeout(r, 5000));
      }

      if (attempt >= 3) {
        throw new Error(`Failed to parse ideas: ${e.message}`)
      }
    }
  }

  throw new Error("Failed to parse ideas")
}

export async function streamTopIdeas(params: {
  signals: {
    github?: GitHubSignals
    package?: PackageSignals
    hn?: HNSignals
    competition?: any
  }
  founderProfile?: {
    background: string[]
    industries: string[]
    timeline: string
  }
}) {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
  const model = genai.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  })

  const signalSummary = JSON.stringify(params.signals, null, 2)
  const founderProfileStr = params.founderProfile
    ? JSON.stringify(params.founderProfile, null, 2)
    : "No profile provided — give general advice"

  const prompt = OPPORTUNITY_PROMPT
    .replace("{SIGNAL_DATA}", signalSummary)
    .replace("{FOUNDER_PROFILE}", founderProfileStr)

  const result = await model.generateContentStream(prompt)
  return result.stream
}
