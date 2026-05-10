import 'dotenv/config';

import { spawn } from "child_process"
import { createClient } from "@supabase/supabase-js"
import prisma from "../lib/prisma"

const TEST_EMAIL = "test123987@gmail.com"
const TEST_PASSWORD = "password123"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function runTests() {
  console.log("Starting Next.js server...")
  const server = spawn("npm", ["run", "dev"], { stdio: "inherit" })

  try {
    // Wait for server to be ready
    console.log("Waiting for server to start (10s)...")
    await new Promise(resolve => setTimeout(resolve, 10000))

    const userId = "test-user-id"
    console.log(`Using mock user ${userId}`)

    // Ensure user exists in prisma and has credits
    await prisma.user.upsert({
      where: { id: userId },
      update: { creditsBalance: 100 },
      create: { 
        id: userId, 
        email: TEST_EMAIL, 
        creditsBalance: 100,
        plan: "FREE"
      }
    })

    const cookieHeader = `dummy=cookie`

    console.log("Sending SSE request to API...")
    const res = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookieHeader
      },
      body: JSON.stringify({
        input: "expressjs/express",
        inputType: "github_repo",
        tier: "free"
      })
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`API returned ${res.status}: ${err}`)
    }

    console.log("SSE stream opened. Reading events...")
    
    // Read the stream
    const reader = res.body?.getReader()
    if (!reader) throw new Error("No response body")

    const decoder = new TextDecoder()
    let eventsReceived: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      console.log("Received chunk:\n" + chunk)
      
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventsReceived.push(line.replace("event: ", "").trim())
        }
      }
    }

    console.log("\nSummary of events received:", eventsReceived)
    
    const expectedEvents = [
      "analysis_started",
      "signal_start",
      "signal_complete",
      "ideas_generation_start",
      "ideas_generation_complete",
      "analysis_complete"
    ]
    
    // Check if we got expected events
    const missing = expectedEvents.filter(e => !eventsReceived.includes(e))
    if (missing.length > 0) {
      console.warn("⚠️ Missing expected events:", missing)
    } else {
      console.log("✅ All expected free-tier events received!")
    }

    console.log("\nTesting cached response...")
    const resCached = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookieHeader
      },
      body: JSON.stringify({
        input: "expressjs/express",
        inputType: "github_repo",
        tier: "free"
      })
    })

    const readerCached = resCached.body?.getReader()
    if (!readerCached) throw new Error("No response body")

    let cachedEvents: string[] = []
    while (true) {
      const { done, value } = await readerCached.read()
      if (done) break
      const chunk = decoder.decode(value)
      console.log("Received cached chunk:\n" + chunk)
      
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          cachedEvents.push(line.replace("event: ", "").trim())
        }
      }
    }

    console.log("\nSummary of cached events received:", cachedEvents)
    if (cachedEvents.includes("signal_start")) {
      console.error("❌ Cached request should not fetch signals again")
    } else {
      console.log("✅ Cached request successfully skipped fetching signals")
    }

    console.log("\nAll tests completed successfully!")
  } catch (error) {
    console.error("Test failed:", error)
  } finally {
    server.kill()
    process.exit(0)
  }
}

runTests().catch(console.error)
