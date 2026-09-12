const KLARNA_BASE = "https://www.klarna.com";
const KLARNA_IMAGE_BASE = "https://www.klarna.com/no/shopping/img";

export function parseKlarnaSearchResults(html) {
  const data = extractDehydratedQueries(html);
  const serpQuery = data.find((q) => q?.queryKey?.[0] === "serp-search");
  const pages = serpQuery?.state?.data?.pages;
  if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page?.products))) {
    throw new Error("Cannot parse Klarna search: expected product pages are missing or malformed");
  }
  const products = pages.flatMap((page) => page.products);

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
    out_of_stock: typeof p.outOfStock === "boolean" ? p.outOfStock : null,
  }));
}

export function parseKlarnaProductDetail(html) {
  const data = extractDehydratedQueries(html);

  const detailQuery = data.find((q) => q?.queryKey?.[0] === "product-detail-initial");
  const offersQuery = data.find((q) => q?.queryKey?.[0] === "product-detail-offers");
  const priceLevelQuery = data.find((q) => q?.queryKey?.[0] === "product-price-level");

  const detail = detailQuery?.state?.data ?? {};
  const product = detail.product;
  if (!product || typeof product.name !== "string" || !product.name.trim()) {
    throw new Error("Cannot parse Klarna product: expected product data is missing or malformed");
  }
  const brand = detail.brand ?? {};

  const offersData = offersQuery?.state?.data ?? {};
  if (
    !Array.isArray(offersData.offers) ||
    (offersData.staticOffers != null && !Array.isArray(offersData.staticOffers))
  ) {
    throw new Error("Cannot parse Klarna product: expected offers are missing or malformed");
  }
  const seen = new Set();
  const offers = [...offersData.offers, ...(offersData.staticOffers ?? [])]
    .filter((offer) => {
      if (!offer || typeof offer !== "object") {
        throw new Error("Cannot parse Klarna product: malformed offer");
      }
      if (!offer.id) return true;
      if (seen.has(offer.id)) return false;
      seen.add(offer.id);
      return true;
    })
    .map((offer) => {
      const price = parseMoney(offer.price);
      const shipping = parseMoney(offer.shippingCost);
      return {
        id: offer.id ?? null,
        name: offer.name ?? null,
        merchant: offersData.merchants?.[offer.merchantId]?.name ?? null,
        url: offerUrl(offer.productRawUrl) ?? offerUrl(offer.url),
        price,
        shipping_cost: shipping,
        total_price:
          price && shipping && price.currency === shipping.currency
            ? { amount: Math.round((price.amount + shipping.amount) * 100) / 100, currency: price.currency }
            : null,
        stock_status: typeof offer.stockStatus === "string" ? offer.stockStatus : null,
        delivery_time: offer.deliveryTime
          ? {
              min_days: deliveryDays(offer.deliveryTime.minDays),
              max_days: deliveryDays(offer.deliveryTime.maxDays),
            }
          : null,
      };
    })
    .sort((a, b) => {
      if (!a.price) return b.price ? 1 : 0;
      if (!b.price) return -1;
      return a.price.currency.localeCompare(b.price.currency) || a.price.amount - b.price.amount;
    });

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
    offers,
    merchants: merchants.sort((a, b) => {
      const pa = Number.isFinite(Number.parseFloat(a.lowest_price)) ? Number.parseFloat(a.lowest_price) : Infinity;
      const pb = Number.isFinite(Number.parseFloat(b.lowest_price)) ? Number.parseFloat(b.lowest_price) : Infinity;
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
      if (Array.isArray(data.__DEHYDRATED_QUERY_STATE__?.queries)) {
        return data.__DEHYDRATED_QUERY_STATE__.queries;
      }
    } catch {
      // not JSON, skip
    }
  }
  return [];
}

function parseMoney(value) {
  if (
    !value ||
    !["string", "number"].includes(typeof value.amount) ||
    String(value.amount).trim() === "" ||
    typeof value.currency !== "string" ||
    !value.currency
  )
    return null;
  const amount = Number(value.amount);
  return Number.isFinite(amount) && amount >= 0 ? { amount, currency: value.currency } : null;
}

function offerUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, KLARNA_BASE);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function deliveryDays(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
