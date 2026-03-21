import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseKlarnaProductDetail, parseKlarnaSearchResults } from "../src/klarna-parse.js";

const searchHtml = readFileSync(new URL("./fixtures/klarna-search.html", import.meta.url), "utf-8");
const detailHtml = readFileSync(new URL("./fixtures/klarna-detail.html", import.meta.url), "utf-8");

describe("parseKlarnaSearchResults", () => {
  it("extracts products from search HTML", () => {
    const results = parseKlarnaSearchResults(searchHtml);

    assert.ok(results.length > 0, "should find at least one product");

    const first = results[0];
    assert.ok(first.id, "should have an id");
    assert.ok(first.name, "should have a name");
    assert.ok(first.lowest_price, "should have a lowest price");
    assert.ok(first.url.includes("klarna.com"), "url should point to klarna");
  });

  it("returns empty array for empty HTML", () => {
    assert.deepStrictEqual(parseKlarnaSearchResults("<html></html>"), []);
  });
});

describe("parseKlarnaProductDetail", () => {
  it("extracts product detail and merchant offers", () => {
    const detail = parseKlarnaProductDetail(detailHtml);

    assert.ok(detail.name, "should have a name");
    assert.ok(Array.isArray(detail.merchants), "should have merchants array");
    assert.ok(detail.merchants.length > 0, "should have at least one merchant");

    const cheapest = detail.merchants[0];
    assert.ok(cheapest.name, "merchant should have a name");
    assert.ok(cheapest.lowest_price, "merchant should have a price");
  });

  it("sorts merchants by price ascending", () => {
    const detail = parseKlarnaProductDetail(detailHtml);
    const prices = detail.merchants.map((m) => Number.parseFloat(m.lowest_price));

    for (let i = 1; i < prices.length; i++) {
      assert.ok(prices[i] >= prices[i - 1], `merchant ${i} should be >= merchant ${i - 1}`);
    }
  });
});
