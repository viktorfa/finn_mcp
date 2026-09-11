import * as cheerio from "cheerio";
import { extractFinnSearchData } from "./finn-search-data.js";

export function parseSearchResults(html) {
  const docs = extractFinnSearchData(html)?.docs ?? [];

  return docs.map((doc) => {
    const finnCode = String(doc.id || doc.ad_id);
    const url = doc.canonical_url || `https://www.finn.no/recommerce/forsale/item/${finnCode}`;
    const result = {
      finn_code: finnCode,
      title: doc.heading,
      price: doc.price ? `${doc.price.amount} ${doc.price.currency_code || "NOK"}` : "No price listed",
      location: doc.location || "No location",
      url,
    };

    if (doc.trade_type) result.trade_type = doc.trade_type;

    const imageUrl = doc.image?.url || (Array.isArray(doc.image_urls) ? doc.image_urls[0] : null);
    if (imageUrl) result.image = imageUrl;

    if (Array.isArray(doc.labels) && doc.labels.length > 0) {
      const labels = doc.labels.map((l) => l.text).filter(Boolean);
      if (labels.length > 0) result.labels = labels;
    }

    return result;
  });
}

export function parseItemDetails(html) {
  const $ = cheerio.load(html);

  const title = $('h1[data-testid="object-title"]').text().trim() || $("h1").first().text().trim();

  const price = $(".h2")
    .filter((_, el) => /\d+\s*kr/.test($(el).text()))
    .first()
    .text()
    .trim();

  const description =
    $('[data-testid="description"] .whitespace-pre-wrap').text().trim() ||
    $('[data-testid="description"]').text().trim();

  const location = $('[data-testid="object-address"]').text().trim();

  const seller =
    $('img[alt*="profilbilde"]').next().text().trim() ||
    $("div")
      .filter((_, el) => $(el).text().includes("Selger:"))
      .text()
      .trim();

  const keyInfo = {};
  $('section[aria-label="Nøkkelinfo"] span p').each((_, el) => {
    const text = $(el).text().trim();
    const bold = $(el).find("b").text().trim();
    const label = text.replace(bold, "").replace(/:\s*$/, "").trim();
    if (label && bold) {
      keyInfo[label] = bold;
    }
  });

  const images = [];
  $('img[data-testid^="image-"]').each((_, el) => {
    const srcset = $(el).attr("srcset");
    if (srcset) {
      const urls = srcset.split(",").map((s) => s.trim().split(" ")[0]);
      const highestRes = urls[urls.length - 1];
      if (highestRes && !images.includes(highestRes)) {
        images.push(highestRes);
      }
    }
  });

  return { title, price, description, location, seller, key_info: keyInfo, images: images.slice(0, 8) };
}
