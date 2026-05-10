import 'dotenv/config';
import { fetchHNDemand } from '../lib/signals/hn.ts';

async function main() {
  console.log("Running HN Signal Fetcher Tests...\n");

  // Test 1: fetchHNDemand("temporal managed hosting")
  console.log("Test 1: temporal managed hosting");
  const result1 = await fetchHNDemand("temporal managed hosting");
  if ('error' in result1) {
    console.error("❌ Failed:", result1);
  } else {
    console.log("✅ no exception thrown");
    if (typeof result1.totalPosts === 'number') console.log("✅ returns object with totalPosts number:", result1.totalPosts);
    else console.error("❌ totalPosts is not a number");
    
    if (Array.isArray(result1.topPosts)) {
      console.log("✅ topPosts is an array");
      console.log("Top 3 posts:");
      result1.topPosts.slice(0, 3).forEach(p => {
        console.log(`- ${p.title} (${p.points} points)`);
      });
    } else {
      console.error("❌ topPosts is not an array");
    }
  }

  // Test 2: fetchHNDemand("something very obscure xyz123")
  console.log("\nTest 2: something very obscure xyz123");
  const result2 = await fetchHNDemand("something very obscure xyz123");
  if ('error' in result2) {
    console.error("❌ Failed:", result2);
  } else {
    if (result2.totalPosts === 0) console.log("✅ returns totalPosts: 0 (not an error)");
    else console.error("❌ totalPosts not 0:", result2.totalPosts);
    
    if (result2.unsolvedPosts === 0) console.log("✅ unsolvedPosts: 0");
    else console.error("❌ unsolvedPosts not 0:", result2.unsolvedPosts);
  }

  console.log("\nAll tests completed!");
}

main().catch(console.error);
