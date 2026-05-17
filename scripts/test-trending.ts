import { fetchTrendingRepos } from "../lib/signals/trending";

const baseUrl = process.env.STACKSIGNAL_URL ?? "http://localhost:3000";
const adminSecret = process.env.ADMIN_SECRET;

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

async function main() {
  const repos = await fetchTrendingRepos();
  assert(repos.length >= 5, "fetchTrendingRepos returns at least 5 repos");
  assert((repos[0]?.stars ?? 0) > 0, "top repo has stars");
  assert(Boolean(repos[0]?.fullName.includes("/")), "top repo fullName contains owner/repo");

  console.log(
    repos
      .slice(0, 5)
      .map((repo, index) => `${index + 1}. ${repo.fullName} (${repo.stars.toLocaleString()} stars)`)
      .join("\n")
  );

  if (!adminSecret) {
    console.log("ADMIN_SECRET missing; skipped manual leaderboard refresh test.");
  } else {
    const refresh = await fetch(`${baseUrl}/api/leaderboard/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: adminSecret, runNow: true }),
    });
    assert(refresh.status === 200, "manual leaderboard refresh returns 200");
  }

  const leaderboard = await fetch(`${baseUrl}/api/leaderboard`);
  assert(leaderboard.status === 200, "leaderboard API returns 200");
  const body = (await leaderboard.json()) as { entries?: Array<{ verdict?: string; signalScore?: number; topIdea?: string }> };
  assert(Array.isArray(body.entries), "leaderboard API returns entries array");

  if (body.entries.length > 0) {
    const top = body.entries[0];
    assert(Boolean(top.verdict), "top entry has verdict");
    assert(typeof top.signalScore === "number" || top.signalScore === undefined, "top entry has optional signalScore");
    console.log("Top entry:", JSON.stringify(top, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
