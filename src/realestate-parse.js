import * as cheerio from "cheerio";
import { decodeLoaderData, decodeStreamRef, extractReactRouterStream } from "./react-router-stream.js";

const SEARCH_ROUTE = "routes/realestate+/_search+/$subvertical.search[.html]";

function findSearchRouteData(loaderData) {
  return loaderData?.[SEARCH_ROUTE] ?? null;
}

function resolveDocRefs(values, arr) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => (typeof value === "number" ? decodeStreamRef(arr[value], arr) : value));
}

export function isSoldRealestateDoc(doc, arr) {
  if (!doc || typeof doc !== "object") return false;

  const flags = resolveDocRefs(doc.flags, arr);
  if (flags.includes("sold")) return true;

  const labels = resolveDocRefs(doc.labels, arr);
  return labels.some((label) => label?.id === "sold" || label?.text === "Solgt");
}

function decodeDocs(html) {
  const arr = extractReactRouterStream(html);
  if (!arr) return { arr: null, docs: [] };

  let docRefs = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === "docs" && Array.isArray(arr[i + 1])) {
      docRefs = arr[i + 1];
      break;
    }
  }
  if (!docRefs?.length) return { arr, docs: [] };

  const docs = docRefs
    .map((ref) => decodeStreamRef(arr[ref], arr))
    .filter((doc) => doc && typeof doc === "object" && doc.id);

  return { arr, docs };
}

export function isSoldRealestateDetail(html) {
  if (/sold-state|disposedText","Solgt"|aria-label="Solgt/i.test(html)) return true;

  const $ = cheerio.load(html);
  if ($('[class*="sold-state"], [aria-label*="Solgt"]').length > 0) return true;

  return $("div").filter((_, el) => $(el).text().trim() === "Solgt").length > 0;
}

function formatPrice(price) {
  if (!price?.amount) return null;
  return `${price.amount} ${price.currency_code || "NOK"}`;
}

function squareMetersFromArea(area) {
  const size = area?.size_from ?? area?.size_to ?? area?.size;
  return typeof size === "number" ? size : null;
}

function pricePerSquareMeter(doc) {
  const amount = doc.price_suggestion?.amount;
  const sqm = squareMetersFromArea(doc.area_range);
  if (!amount || !sqm) return null;
  return Math.round(amount / sqm);
}

export function mapRealestateListing(doc) {
  const sqm = squareMetersFromArea(doc.area_range);
  const result = {
    finn_code: String(doc.id || doc.ad_id),
    status: "for_sale",
    heading: doc.heading,
    location: doc.location,
    local_area: doc.local_area_name || null,
    property_type: doc.property_type_description || null,
    ownership_type: doc.owner_type_description?.trim() || null,
    bedrooms: doc.number_of_bedrooms ?? null,
    price: formatPrice(doc.price_suggestion),
    total_price: formatPrice(doc.price_total),
    shared_cost_monthly: formatPrice(doc.price_shared_cost),
    size_sqm: sqm,
    price_per_sqm: pricePerSquareMeter(doc),
    url: doc.canonical_url || `https://www.finn.no/realestate/homes/ad.html?finnkode=${doc.id || doc.ad_id}`,
    image: doc.image?.url || doc.image_urls?.[0] || null,
    organisation: doc.organisation_name || null,
  };

  if (doc.coordinates?.lat && doc.coordinates?.lon) {
    result.coordinates = { lat: doc.coordinates.lat, lon: doc.coordinates.lon };
  }

  return result;
}

export function parseRealestateSearchResults(html, { includeSold = false } = {}) {
  const loaderData = decodeLoaderData(html);
  const routeData = findSearchRouteData(loaderData);
  const { arr, docs } = decodeDocs(html);
  const activeDocs = includeSold ? docs : docs.filter((doc) => !isSoldRealestateDoc(doc, arr));
  const results = activeDocs.map(mapRealestateListing);
  const metadata = routeData?.results?.metadata ?? null;
  const filteredSoldCount = includeSold ? 0 : docs.length - activeDocs.length;

  return {
    total_results: results.length,
    page: metadata?.paging?.current ?? 1,
    total_pages: metadata?.paging?.last ?? null,
    sort: metadata?.sort ?? null,
    title: metadata?.title ?? null,
    filtered_sold_count: filteredSoldCount,
    results,
  };
}

function flattenLocationItems(items, path = [], arr = null) {
  const results = [];
  for (const rawItem of items) {
    const item = arr && typeof rawItem === "number" ? decodeStreamRef(arr[rawItem], arr) : rawItem;
    if (!item || typeof item !== "object") continue;

    const name = item.display_name || item.name;
    const value = item.value;
    const count = item.count;
    const currentPath = name ? [...path, name] : path;

    if (name && value) {
      results.push({
        name,
        location_code: String(value),
        count: typeof count === "number" ? count : null,
        path: currentPath.join(" > "),
      });
    }

    if (item.filter_items?.length) {
      results.push(...flattenLocationItems(item.filter_items, currentPath, arr));
    }
  }
  return results;
}

export function parseRealestateLocationFilters(html, query) {
  const arr = extractReactRouterStream(html);
  if (!arr) return [];

  let locationFilter = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== "filters" || !Array.isArray(arr[i + 1])) continue;
    for (const ref of arr[i + 1]) {
      const filter = decodeStreamRef(arr[ref], arr);
      if (filter?.name === "location") {
        locationFilter = filter;
        break;
      }
    }
    if (locationFilter) break;
  }

  const items = flattenLocationItems(locationFilter?.filter_items ?? [], [], arr);
  if (!query) return items.slice(0, 50);

  const q = query.toLowerCase();
  return items
    .filter((item) => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q))
    .slice(0, 50);
}

export function parseRealestateDetail(html) {
  const $ = cheerio.load(html);

  const title = $('[data-testid="object-title"]').text().trim() || $("h1").first().text().trim();

  const address = $('[data-testid="object-address"]').text().trim() || null;

  const price =
    $('[data-testid="price"] .t2, [data-testid="price"]').first().text().trim() ||
    $(".t2")
      .filter((_, el) => /\d[\d\s]*kr/.test($(el).text()))
      .first()
      .text()
      .trim() ||
    null;

  const description =
    $('[data-testid="description"] .whitespace-pre-wrap').text().trim() ||
    $('[data-testid="description"]').text().trim() ||
    null;

  const keyInfo = {};
  $('[data-testid^="info-"]').each((_, el) => {
    const testId = $(el).attr("data-testid") || "";
    const label = testId.replace(/^info-/, "").replace(/-/g, " ");
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text) keyInfo[label] = text;
  });

  const images = [];
  $('[data-testid="image-gallery"] img, [data-testid^="gallery-"] img').each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && !images.includes(src)) images.push(src);
  });

  const localArea = $('[data-testid="local-area-name"]').text().trim() || null;
  const sold = isSoldRealestateDetail(html);

  return {
    status: sold ? "sold" : "for_sale",
    title: title || null,
    price: price || null,
    address,
    local_area: localArea,
    description,
    key_info: keyInfo,
    images: images.slice(0, 12),
  };
}
