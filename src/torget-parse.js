import * as cheerio from "cheerio";

export function parseSearchResults(html) {
  const $ = cheerio.load(html);
  const results = [];

  $("article.sf-search-ad").each((_, element) => {
    const $el = $(element);
    const linkEl = $el.find("a.sf-search-ad-link").first();
    const href = linkEl.attr("href");
    let finnCode = null;

    if (href) {
      if (href.includes("/recommerce/forsale/item/")) {
        finnCode = href.split("/").pop();
      } else if (href.includes("finnkode=")) {
        finnCode = href.split("finnkode=")[1];
      }
    }

    const title = linkEl.text().trim();
    const price =
      $el.find(".flex.justify-between.font-bold span").first().text().trim() ||
      $el
        .find("span")
        .filter((_, span) => /\d+\s*kr/.test($(span).text()))
        .first()
        .text()
        .trim();
    const locationAndTime = $el.find(".s-text-subtle .whitespace-nowrap");
    const location = locationAndTime.first().text().trim();
    const timeAgo = locationAndTime.last().text().trim();

    const imageEl = $el.find("img").first();
    const imageSrc = imageEl.attr("src");

    const sizeAndBrand = $el
      .find(".flex.flex-wrap.mt-4.text-xs span")
      .filter((_, span) => {
        const text = $(span).text().trim();
        return text.startsWith("Str.") || (!text.includes("siden") && !text.includes("Kjøp") && text.length > 0);
      })
      .map((_, span) =>
        $(span)
          .text()
          .trim()
          .replace(/^Str\.\s*/, ""),
      )
      .get()
      .filter((text) => text && !locationAndTime.toArray().some((el) => $(el).text().trim() === text));

    if (finnCode && title) {
      const result = {
        finn_code: finnCode,
        title,
        price: price || "No price listed",
        location: location || "No location",
        time_ago: timeAgo || "",
        url: href.startsWith("http") ? href : `https://www.finn.no${href}`,
      };

      if (imageSrc) {
        result.image = imageSrc;
      }

      if (sizeAndBrand.length === 1 && sizeAndBrand[0]) {
        result.size = sizeAndBrand[0];
      } else if (sizeAndBrand.length === 2) {
        result.size = sizeAndBrand[0];
        result.brand = sizeAndBrand[1];
      } else if (sizeAndBrand.length > 0) {
        result.attributes = sizeAndBrand;
      }

      results.push(result);
    }
  });

  return results;
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

  const condition = $("span")
    .filter((_, el) => $(el).text().includes("Tilstand"))
    .find("b")
    .text()
    .trim();
  const size = $("span")
    .filter((_, el) => $(el).text().includes("Størrelse"))
    .find("b")
    .text()
    .trim();
  const color = $("span")
    .filter((_, el) => $(el).text().includes("Farge"))
    .find("b")
    .text()
    .trim();

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

  const keyInfo = {};
  if (condition) keyInfo.condition = condition;
  if (size) keyInfo.size = size;
  if (color) keyInfo.color = color;

  return { title, price, description, location, seller, key_info: keyInfo, images: images.slice(0, 8) };
}
