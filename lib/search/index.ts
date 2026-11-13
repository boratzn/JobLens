export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
}

export interface CompanySearchResults {
  queryList: string[];
  items: SearchResultItem[];
  provider: "tavily" | "serper" | "none";
}

export async function searchCompanyWeb(
  companyName: string
): Promise<CompanySearchResults> {
  const provider = (process.env.SEARCH_PROVIDER || "none").toLowerCase() as
    | "tavily"
    | "serper"
    | "none";

  if (provider === "none") {
    return {
      queryList: [],
      items: [],
      provider: "none",
    };
  }

  const currentYear = new Date().getFullYear();
  const queries = [
    `"${companyName}" hakkında`,
    `"${companyName}" çalışan yorumları şirket kültürü`,
    `"${companyName}" haberler ${currentYear}`,
    `"${companyName}" iş görüşmesi mülakat`,
  ];

  if (provider === "tavily") {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.warn("TAVILY_API_KEY eksik, web araması atlanıyor.");
      return { queryList: queries, items: [], provider: "none" };
    }

    try {
      const searchPromises = queries.map(async (query) => {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: "basic",
            max_results: 2,
            include_answer: false,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return [];
        const json = await res.json();
        return (json.results || []).map((r: any) => ({
          title: r.title || query,
          url: r.url,
          content: r.content || "",
        }));
      });

      const nested = await Promise.all(searchPromises);
      const items = deduplicateByUrl(nested.flat());
      return { queryList: queries, items, provider: "tavily" };
    } catch (err) {
      console.warn("Tavily search hatası:", err);
      return { queryList: queries, items: [], provider: "none" };
    }
  }

  if (provider === "serper") {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      console.warn("SERPER_API_KEY eksik, web araması atlanıyor.");
      return { queryList: queries, items: [], provider: "none" };
    }

    try {
      const searchPromises = queries.map(async (q) => {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
          },
          body: JSON.stringify({ q, gl: "tr", hl: "tr", num: 3 }),
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return [];
        const json = await res.json();
        return (json.organic || []).map((r: any) => ({
          title: r.title || q,
          url: r.link,
          content: r.snippet || "",
        }));
      });

      const nested = await Promise.all(searchPromises);
      const items = deduplicateByUrl(nested.flat());
      return { queryList: queries, items, provider: "serper" };
    } catch (err) {
      console.warn("Serper search hatası:", err);
      return { queryList: queries, items: [], provider: "none" };
    }
  }

  return { queryList: queries, items: [], provider: "none" };
}

function deduplicateByUrl(items: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  const out: SearchResultItem[] = [];
  for (const item of items) {
    if (item.url && !seen.has(item.url)) {
      seen.add(item.url);
      out.push(item);
    }
  }
  return out;
}
