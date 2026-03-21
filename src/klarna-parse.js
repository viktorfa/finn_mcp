const KLARNA_BASE = "https://www.klarna.com";
const KLARNA_IMAGE_BASE = "https://www.klarna.com/no/shopping/img";

export function parseKlarnaSearchResults(html) {
  const data = extractDehydratedQueries(html);
  const serpQuery = data.find((q) => q.queryKey?.[0] === "serp-search");
  if (!serpQuery) return [];

  const pages = serpQuery.state?.data?.pages ?? [];
  const products = pages.flatMap((page) => page.products ?? []);

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || null,
    url: `${KLARNA_BASE}/no/shopping${p.url}`,
    lowest_price: p.lowestPrice ? `${p.lowestPrice.amount} ${p.lowestPrice.currency}` : null,
    store_count: p.previewMerchants?.count ?? null,
    category: p.category?.name ?? null,
    image: p.image?.path ? `${KLARNA_IMAGE_BASE}${p.image.path}` : null,
    price_drop: p.priceDrop
      ? { old_price: `${p.priceDrop.oldPrice.amount} ${p.priceDrop.oldPrice.currency}`, percent: p.priceDrop.percent }
      : null,
    out_of_stock: p.outOfStock ?? false,
  }));
}

export function parseKlarnaProductDetail(html) {
  const data = extractDehydratedQueries(html);

  const detailQuery = data.find((q) => q.queryKey?.[0] === "product-detail-initial");
  const offersQuery = data.find((q) => q.queryKey?.[0] === "product-detail-offers");
  const priceLevelQuery = data.find((q) => q.queryKey?.[0] === "product-price-level");

  const detail = detailQuery?.state?.data ?? {};
  const product = detail.product ?? {};
  const brand = detail.brand ?? {};

  const offersData = offersQuery?.state?.data ?? {};
  const merchantFilter = offersData.filters?.find((f) => f.id === "af_MERCHANT");
  const merchants = (merchantFilter?.filterOptions ?? []).map((m) => ({
    name: m.name,
    lowest_price: m.lowestPrice ? `${m.lowestPrice.amount} ${m.lowestPrice.currency}` : null,
  }));

  const priceLevel = priceLevelQuery?.state?.data ?? {};

  return {
    name: product.name || null,
    description: product.description || null,
    brand: brand.name || null,
    category: detail.category?.name ?? null,
    review_summary: detail.reviewSummary ?? null,
    merchants: merchants.sort((a, b) => {
      const pa = Number.parseFloat(a.lowest_price) || Infinity;
      const pb = Number.parseFloat(b.lowest_price) || Infinity;
      return pa - pb;
    }),
    price_trend: priceLevel.priceChange
      ? { change_percent: priceLevel.priceChange.percent, change_absolute: priceLevel.priceChange.absolute }
      : null,
  };
}

function extractDehydratedQueries(html) {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRegex)) {
    const content = match[1].trim();
    if (!content.startsWith("{")) continue;
    try {
      const data = JSON.parse(content);
      if (data.__DEHYDRATED_QUERY_STATE__) {
        return data.__DEHYDRATED_QUERY_STATE__.queries ?? [];
      }
    } catch {
      // not JSON, skip
    }
  }
  return [];
}
