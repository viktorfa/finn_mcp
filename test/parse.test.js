import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseItemDetails, parseSearchResults } from "../src/parse.js";

const searchHtml = readFileSync(new URL("./fixtures/search.html", import.meta.url), "utf-8");
const itemHtml = readFileSync(new URL("./fixtures/item.html", import.meta.url), "utf-8");

describe("parseSearchResults", () => {
  it("extracts results from search HTML", () => {
    const results = parseSearchResults(searchHtml);

    assert.ok(results.length > 0, "should find at least one result");

    const first = results[0];
    assert.ok(first.finn_code, "result should have a finn_code");
    assert.ok(first.title, "result should have a title");
    assert.ok(first.url.includes("finn.no"), "result url should point to finn.no");
  });

  it("returns empty array for empty HTML", () => {
    const results = parseSearchResults("<html><body></body></html>");
    assert.deepStrictEqual(results, []);
  });
});

describe("parseItemDetails", () => {
  it("extracts details from item HTML", () => {
    const details = parseItemDetails(itemHtml);

    assert.ok(details.title, "should have a title");
    assert.ok("key_info" in details, "should have key_info object");
    assert.ok(Array.isArray(details.images), "images should be an array");
  });
});
