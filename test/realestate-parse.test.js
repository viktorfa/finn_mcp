import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  isSoldRealestateDetail,
  isSoldRealestateDoc,
  parseRealestateDetail,
  parseRealestateLocationFilters,
  parseRealestateSearchResults,
} from "../src/realestate-parse.js";

const searchHtml = readFileSync(new URL("./fixtures/realestate-search-forus.html", import.meta.url), "utf-8");
const detailHtml = readFileSync(new URL("./fixtures/realestate-detail.html", import.meta.url), "utf-8");
const soldDetailHtml = readFileSync(new URL("./fixtures/realestate-detail-sold.html", import.meta.url), "utf-8");

describe("parseRealestateSearchResults", () => {
  it("extracts listings from search HTML", () => {
    const data = parseRealestateSearchResults(searchHtml);
    assert.ok(data.results.length > 0, "should find listings");
    assert.ok(data.total_results > 0, "should report total results");

    const first = data.results[0];
    assert.ok(first.finn_code, "should have finn_code");
    assert.ok(first.heading, "should have heading");
    assert.ok(first.price, "should have price");
    assert.ok(first.url.includes("finnkode="), "should have listing url");
  });

  it("includes price per square meter when size is available", () => {
    const data = parseRealestateSearchResults(searchHtml);
    const withSqm = data.results.find((r) => r.price_per_sqm != null);
    assert.ok(withSqm, "at least one listing should have price_per_sqm");
    assert.ok(withSqm.size_sqm > 0);
  });

  it("returns empty results for HTML without stream data", () => {
    const data = parseRealestateSearchResults("<html></html>");
    assert.deepStrictEqual(data.results, []);
  });

  it("filters sold listings from search results", () => {
    const doc = {
      id: "467207655",
      flags: [1],
      labels: [2],
    };
    const arr = [null, "sold", { id: "sold", text: "Solgt", type: "PRIMARY" }];

    assert.equal(isSoldRealestateDoc(doc, arr), true);
    assert.equal(isSoldRealestateDoc({ id: "123", flags: [], labels: [] }, arr), false);
  });
});

describe("parseRealestateLocationFilters", () => {
  it("finds Forus in location filters", () => {
    const locations = parseRealestateLocationFilters(searchHtml, "forus");
    const forus = locations.find((l) => /forus/i.test(l.name));
    assert.ok(forus, "should find Forus area");
    assert.ok(forus.location_code.includes("."), "should have hierarchical location code");
  });
});

describe("parseRealestateDetail", () => {
  it("extracts property details", () => {
    const detail = parseRealestateDetail(detailHtml);
    assert.equal(detail.status, "for_sale");
    assert.ok(detail.title, "should have title");
    assert.ok(detail.address, "should have address");
    assert.ok(Object.keys(detail.key_info).length > 0, "should have key info");
  });

  it("detects sold listings on detail pages", () => {
    assert.equal(isSoldRealestateDetail(soldDetailHtml), true);
    const detail = parseRealestateDetail(soldDetailHtml);
    assert.equal(detail.status, "sold");
  });
});
