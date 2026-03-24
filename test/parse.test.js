import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseItemDetails, parseSearchResults } from "../src/torget-parse.js";

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

  it("extracts all key-value pairs from Nøkkelinfo section", () => {
    const html = `<html><body>
      <h1 data-testid="object-title">Test item</h1>
      <section aria-label="Nøkkelinfo">
        <span><p>Tilstand: <b>Som ny - Ikke synlig brukt</b></p></span>
        <span><p>Lengde: <b>180 cm</b></p></span>
        <span><p>Merke: <b>Rossignol</b></p></span>
        <span><p>Farge: <b>Rød</b></p></span>
      </section>
    </body></html>`;
    const details = parseItemDetails(html);

    assert.equal(details.key_info["Tilstand"], "Som ny - Ikke synlig brukt");
    assert.equal(details.key_info["Lengde"], "180 cm");
    assert.equal(details.key_info["Merke"], "Rossignol");
    assert.equal(details.key_info["Farge"], "Rød");
  });

  it("returns empty key_info for HTML without Nøkkelinfo", () => {
    const html = '<html><body><h1>No info</h1></body></html>';
    const details = parseItemDetails(html);
    assert.deepStrictEqual(details.key_info, {});
  });
});
