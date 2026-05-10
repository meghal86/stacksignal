import 'dotenv/config';
import { fetchPackageSignals } from '../lib/signals/packages.ts';
import prisma from '../lib/prisma.ts';

async function main() {
  console.log("Running Package Signal Fetcher Tests...\n");

  // Test 1: fetchPackageSignals("@temporalio/client", "npm")
  console.log("Test 1: @temporalio/client (npm)");
  const result1 = await fetchPackageSignals("@temporalio/client", "npm");
  if ('error' in result1) {
    console.error("❌ Failed:", result1);
  } else {
    console.log("✅ Fetched successfully.");
    if (result1.weeklyDownloads > 0) console.log("✅ weeklyDownloads > 0");
    else console.error("❌ weeklyDownloads <= 0");
    
    if (result1.githubUrl) console.log("✅ githubUrl is not null:", result1.githubUrl);
    else console.error("❌ githubUrl is null");
  }

  // Check cache
  const cached = await prisma.signalTarget.findUnique({
    where: {
      type_identifier: {
        type: "NPM_PACKAGE",
        identifier: "@temporalio/client".toLowerCase()
      }
    }
  });
  if (cached) console.log("✅ cached in Supabase after first call");
  else console.error("❌ not cached in Supabase");

  // Call again
  const start = Date.now();
  await fetchPackageSignals("@temporalio/client", "npm");
  const duration = Date.now() - start;
  if (duration < 100) console.log(`✅ second call returns fast (${duration}ms)`);
  else console.error(`❌ second call took too long (${duration}ms)`);

  // Test 2: fetchPackageSignals("requests", "pypi")
  console.log("\nTest 2: requests (pypi)");
  const result2 = await fetchPackageSignals("requests", "pypi");
  if ('error' in result2) {
    console.error("❌ Failed:", result2);
  } else {
    console.log("✅ no exception thrown");
    if (result2.weeklyDownloads > 0) console.log("✅ weeklyDownloads > 0");
    else console.error("❌ weeklyDownloads <= 0");
  }

  // Test 3: fetchPackageSignals("this-package-does-not-exist-xyz", "npm")
  console.log("\nTest 3: this-package-does-not-exist-xyz (npm)");
  const result3 = await fetchPackageSignals("this-package-does-not-exist-xyz", "npm");
  if ('error' in result3 && result3.code === 'NOT_FOUND') {
    console.log("✅ returns SignalError with code NOT_FOUND");
  } else {
    console.error("❌ Did not return NOT_FOUND error:", result3);
  }

  console.log("\nAll tests completed!");
  await prisma.$disconnect();
}

main().catch(console.error);
