import * as cheerio from "cheerio";

export function parseMobilitySearchResults(html) {
  const data = extractDehydratedTanstack(html);
  if (!data) return [];

  const docsQuery = data.queries?.find((q) => q.state?.data?.docs);
  const docs = docsQuery?.state?.data?.docs ?? [];

  return docs.map((doc) => {
    const result = {
      finn_code: String(doc.ad_id || doc.id),
      heading: doc.heading,
      location: doc.location,
      price: doc.price ? `${doc.price.amount} ${doc.price.currency_code}` : null,
      year: doc.year ?? null,
      url: doc.canonical_url || `https://www.finn.no/mobility/item/${doc.ad_id || doc.id}`,
      image: doc.image?.url || null,
    };

    // Car-specific fields
    if (doc.make) result.make = doc.make;
    if (doc.model) result.model = doc.model;
    if (doc.mileage != null) result.mileage = `${doc.mileage} ${doc.mileage_unit || "km"}`;
    if (doc.fuel) result.fuel = doc.fuel;
    if (doc.transmission) result.transmission = doc.transmission;
    if (doc.registration_class) result.registration_class = doc.registration_class.value || doc.registration_class;

    // Boat-specific fields
    if (doc.boat_class) result.boat_class = doc.boat_class;
    if (doc.length) result.length = doc.length;
    if (doc.motor_type) result.motor_type = doc.motor_type;
    if (doc.motor_fuel) result.motor_fuel = doc.motor_fuel;
    if (doc.motor_size) result.motor_size = doc.motor_size;
    if (doc.max_speed) result.max_speed = doc.max_speed;

    if (doc.dealer_segment) result.dealer_segment = doc.dealer_segment;

    return result;
  });
}

export function parseMobilityItemDetail(html) {
  const $ = cheerio.load(html);

  // Extract JSON-LD Product
  let product = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data["@type"] === "Product") {
        product = {
          name: data.name,
          brand: data.brand?.name || null,
          model: data.model || null,
          price: data.offers?.price ? `${data.offers.price} ${data.offers.priceCurrency || "NOK"}` : null,
          images: Array.isArray(data.image) ? data.image : data.image ? [data.image] : [],
        };
      }
    } catch {
      // not valid JSON
    }
  });

  // Extract dt/dd spec pairs
  const specs = {};
  $("dt").each((_, dt) => {
    const label = $(dt).text().trim();
    const value = $(dt).next("dd").text().trim();
    if (label && value) {
      specs[label] = value;
    }
  });

  // Extract description
  const description =
    $('[data-testid="description"] .whitespace-pre-wrap').text().trim() ||
    $('[data-testid="description"]').text().trim() ||
    "";

  // Extract location
  const location = $('[data-testid="object-address"]').text().trim() || "";

  return {
    ...product,
    specs,
    description: description || null,
    location: location || null,
  };
}

function extractDehydratedTanstack(html) {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRegex)) {
    const content = match[1].trim();
    // Base64-encoded TanStack data starts with "ey" (base64 for "{")
    if (!content.startsWith("ey") || content.length < 10000) continue;
    try {
      const decoded = Buffer.from(content, "base64").toString("utf-8");
      const data = JSON.parse(decoded);
      if (data.queries) return data;
    } catch {
      // not valid base64/JSON
    }
  }
  return null;
}
