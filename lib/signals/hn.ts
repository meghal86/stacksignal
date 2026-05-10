export interface HNSignals {
  totalPosts: number
  unsolvedPosts: number
  topPosts: Array<{
    title: string
    points: number
    comments: number
    url: string
    postedAt: string
  }>
}

export interface SignalError {
  error: true
  message: string
  code: "NOT_FOUND" | "RATE_LIMITED" | "INVALID_INPUT" | "UNKNOWN"
}

export async function fetchHNDemand(query: string): Promise<HNSignals | SignalError> {
  try {
    if (!query) {
      return { error: true, message: "Query is required", code: "INVALID_INPUT" };
    }

    const twelveMonthsAgo = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
    const searchQuery = `${query} is there a tool`;
    const apiUrl = new URL("https://hn.algolia.com/api/v1/search");
    apiUrl.searchParams.append("query", searchQuery);
    apiUrl.searchParams.append("tags", "ask_hn");
    apiUrl.searchParams.append("numericFilters", `points>30,created_at_i>${twelveMonthsAgo}`);

    const res = await fetch(apiUrl.toString());

    if (res.status === 429) return { error: true, message: "Rate limited", code: "RATE_LIMITED" };
    if (!res.ok) return { error: true, message: `HN Algolia API error: ${res.statusText}`, code: "UNKNOWN" };

    const data = await res.json();
    const hits = data.hits || [];

    const topPosts = hits.map((hit: any) => ({
      title: hit.title || "",
      points: hit.points || 0,
      comments: hit.num_comments || 0,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      postedAt: hit.created_at || ""
    }));

    let unsolvedPosts = 0;
    const SOLVED_KEYWORDS = [
      "yes, use", "try ", "check out", "look at",
      "i use", "i recommend", "have you tried"
    ];

    for (const hit of hits) {
      let isSolved = false;
      const textToCheck = ((hit.title || "") + " " + (hit.comment_text || "")).toLowerCase();

      for (const kw of SOLVED_KEYWORDS) {
        if (textToCheck.includes(kw.toLowerCase())) {
          isSolved = true;
          break;
        }
      }
      
      if (!isSolved) {
        unsolvedPosts++;
      }
    }

    return {
      totalPosts: data.nbHits || hits.length,
      unsolvedPosts,
      topPosts
    };

  } catch (error: any) {
    return { error: true, message: error.message || "Unknown error", code: "UNKNOWN" };
  }
}
