export interface CompetitionSignals {
  competitors: Array<{
    name: string;
    url: string;
    priceRange: string | null;
    targetMarket: string | null;
    weakness: string | null;
    isFunded?: boolean;
    onProductHunt?: boolean;
  }>;
  gapFound: boolean;
  gapDescription: string;
  crowdednessScore: number;
  marketValidation: string | null;
}

export async function fetchCompetition(opportunity: string): Promise<CompetitionSignals | { error: string }> {
  try {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return { error: "SERPER_API_KEY missing" };

    const queries = [
      `${opportunity} SaaS tool pricing`,
      `${opportunity} alternative`,
      `${opportunity} site:producthunt.com`,
      `${opportunity} venture capital funding crunchbase`
    ];

    const results = await Promise.all(queries.map(q => searchSerper(q, apiKey)));
    
    const competitorsMap = new Map<string, any>();
    let onProductHuntCount = 0;
    let fundedCount = 0;

    results.forEach((res, index) => {
      res.organic?.forEach((item: any) => {
        const url = new URL(item.link);
        const domain = url.hostname.replace("www.", "");
        const snippet = (item.snippet || "").toLowerCase();
        
        if (domain === "producthunt.com") {
          onProductHuntCount++;
          return;
        }

        if (!competitorsMap.has(domain) && !isExcludedDomain(domain)) {
          const isFunded = snippet.includes("funded") || snippet.includes("raised") || snippet.includes("series") || index === 3;
          if (isFunded) fundedCount++;

          competitorsMap.set(domain, {
            name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
            url: item.link,
            priceRange: extractPrice(item.snippet),
            targetMarket: extractTargetMarket(item.snippet),
            weakness: extractWeakness(item.snippet),
            isFunded,
            onProductHunt: snippet.includes("product hunt")
          });
        }
      });
    });

    const competitors = Array.from(competitorsMap.values()).slice(0, 10);
    const count = competitors.length;
    
    // Crowdedness Scoring (Phase 1 algorithm)
    let crowdednessScore = 5;
    if (count === 0) crowdednessScore = 1;
    else if (count <= 2) crowdednessScore = 3;
    else if (count <= 5) crowdednessScore = 6;
    else crowdednessScore = 9;

    // Penalty for high funding in market
    if (fundedCount > 2) crowdednessScore += 2;
    if (onProductHuntCount > 5) crowdednessScore += 1;

    crowdednessScore = Math.min(10, crowdednessScore);

    return {
      competitors,
      gapFound: count < 3 && fundedCount === 0,
      gapDescription: count === 0 
        ? "No direct competitors found. Blue ocean territory." 
        : `Found ${count} potential competitors. ${fundedCount} appear to be venture-funded.`,
      crowdednessScore,
      marketValidation: onProductHuntCount > 0 ? `Active market with ${onProductHuntCount} PH launches.` : "Limited market validation found."
    };
  } catch (error: any) {
    console.error("Error fetching competition signals:", error);
    return { error: "Failed to fetch competition signals" };
  }
}

async function searchSerper(query: string, apiKey: string) {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ q: query })
  });
  return await res.json();
}

function isExcludedDomain(domain: string): boolean {
  const excluded = [
    'github.com', 'reddit.com', 'news.ycombinator.com', 'stackoverflow.com', 
    'medium.com', 'twitter.com', 'youtube.com', 'linkedin.com', 'crunchbase.com',
    'producthunt.com', 'facebook.com', 'instagram.com'
  ];
  return excluded.some(d => domain.includes(d));
}

function extractPrice(snippet: string): string | null {
  const priceMatch = snippet.match(/\$\d+/);
  return priceMatch ? `${priceMatch[0]}+` : null;
}

function extractTargetMarket(snippet: string): string | null {
  const s = snippet.toLowerCase();
  if (s.includes("enterprise") || s.includes("b2b")) return "Enterprise";
  if (s.includes("developer") || s.includes("engineer")) return "Developers";
  if (s.includes("startup") || s.includes("founder")) return "Startups";
  if (s.includes("small business") || s.includes("smb")) return "SMBs";
  return null;
}

function extractWeakness(snippet: string): string | null {
  const s = snippet.toLowerCase();
  if (s.includes("expensive") || s.includes("costly")) return "High Price";
  if (s.includes("complex") || s.includes("hard to use")) return "Complexity";
  if (s.includes("limited") || s.includes("basic")) return "Limited Features";
  if (s.includes("slow") || s.includes("laggy")) return "Performance";
  return null;
}

