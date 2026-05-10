
import { generateBuildRoomContent } from "./lib/agents/buildRoomEngine.ts";
import * as dotenv from "dotenv";
dotenv.config();

async function test() {
  const mockIdea = {
    name: "AI Code Auditor",
    description: "An AI agent that audits smart contracts for security vulnerabilities."
  };
  
  const mockAnalysis = {
    verdict: "BUILD",
    verdictReasoning: "High demand for smart contract security in the DeFi space.",
    demandScore: 9.2,
    founderFitScore: 8.5
  };

  try {
    console.log("Generating Build Room Content...");
    const content = await generateBuildRoomContent({
      selectedIdea: mockIdea,
      analysis: mockAnalysis
    });
    console.log("Success!");
    console.log("Financial Model:", JSON.stringify(content.financialModel, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
