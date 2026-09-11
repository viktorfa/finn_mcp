export function extractFinnSearchData(html) {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRegex)) {
    const content = match[1].trim();
    if (!content.startsWith("ey")) continue;
    try {
      const data = JSON.parse(Buffer.from(content, "base64").toString("utf-8"));
      if (!Array.isArray(data.queries)) continue;
      const query = data.queries.find(
        (q) => q?.queryKey?.[0]?.scope === "search" && Array.isArray(q.state?.data?.docs),
      );
      if (query) return query.state.data;
    } catch {
      // Ignore scripts that are not base64-encoded JSON.
    }
  }
  return null;
}

export function parseFinnSearchPaging(html) {
  const metadata = extractFinnSearchData(html)?.metadata;
  const count = (value, minimum = 0) => (Number.isSafeInteger(value) && value >= minimum ? value : null);
  return {
    total_results: count(metadata?.result_size?.match_count),
    page: count(metadata?.paging?.current, 1),
    total_pages: count(metadata?.paging?.last),
  };
}
