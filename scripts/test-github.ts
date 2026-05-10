import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { fetchGitHubSignals } from "../lib/signals/github"

async function run() {
  const result = await fetchGitHubSignals("temporalio/temporal")
  console.log(result)
}

run().catch(console.error)
