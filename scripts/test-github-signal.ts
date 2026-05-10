import 'dotenv/config';
import { fetchGitHubSignals } from '../lib/signals/github.ts';
import prisma from '../lib/prisma.ts';

async function main() {
  console.log("Running GitHub Signal Fetcher Tests...\n");

  // Test 1: Valid URL (temporalio/temporal)
  console.log("Test 1: Fetching temporalio/temporal...");
  const result1 = await fetchGitHubSignals("temporalio/temporal");
  
  if ('error' in result1) {
    console.error("❌ Expected success, got error:", result1);
  } else {
    console.log("✅ Fetched successfully.");
    console.log(`Stars: ${result1.stars} (Expected > 10000)`);
    if (result1.stars > 10000) {
      console.log("✅ Stars > 10000 verified.");
    } else {
      console.error("❌ Stars verification failed.");
    }

    console.log(`Hosting Requests Last 90d: ${result1.hostingRequestsLast90d} (Expected > 0)`);
    if (result1.hostingRequestsLast90d > 0) {
      console.log("✅ Hosting requests > 0 verified.");
    } else {
      console.error("❌ Hosting requests verification failed.");
    }
  }

  // Test 2: Caching
  console.log("\nTest 2: Verifying cache...");
  const dbRecord = await prisma.signalTarget.findUnique({
    where: {
      type_identifier: {
        type: "GITHUB_REPO",
        identifier: "temporalio/temporal"
      }
    }
  });

  if (dbRecord) {
    console.log("✅ Record exists in DB.");
    
    // Call again to verify cached
    const startTime = Date.now();
    const cachedResult = await fetchGitHubSignals("temporalio/temporal");
    const duration = Date.now() - startTime;
    
    if (!('error' in cachedResult)) {
      console.log(`✅ Second call successful. Took ${duration}ms (should be fast due to cache).`);
    } else {
      console.error("❌ Second call failed.");
    }
  } else {
    console.error("❌ Record not found in DB.");
  }

  // Test 3: Invalid URL format
  console.log("\nTest 3: Invalid URL format...");
  const result3 = await fetchGitHubSignals("not_a_valid_url_at_all!@#");
  if ('error' in result3 && result3.code === 'INVALID_URL') {
    console.log("✅ Returned INVALID_URL error as expected.");
  } else {
    console.error("❌ Invalid URL test failed:", result3);
  }

  // Test 4: Not found repository
  console.log("\nTest 4: Not found repository...");
  const result4 = await fetchGitHubSignals("not-a-real/repo-xyz123");
  if ('error' in result4 && result4.code === 'NOT_FOUND') {
    console.log("✅ Returned NOT_FOUND error as expected.");
  } else {
    console.error("❌ Not found repository test failed:", result4);
  }

  console.log("\nAll tests completed!");
  await prisma.$disconnect();
}

main().catch(console.error);
