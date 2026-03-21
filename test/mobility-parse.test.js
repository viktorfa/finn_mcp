import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseMobilityItemDetail, parseMobilitySearchResults } from "../src/mobility-parse.js";

const carSearchHtml = readFileSync(new URL("./fixtures/mobility-search-car.html", import.meta.url), "utf-8");
const boatSearchHtml = readFileSync(new URL("./fixtures/mobility-search-boat.html", import.meta.url), "utf-8");
const carDetailHtml = readFileSync(new URL("./fixtures/mobility-item-car.html", import.meta.url), "utf-8");
const boatDetailHtml = readFileSync(new URL("./fixtures/mobility-item-boat.html", import.meta.url), "utf-8");

describe("parseMobilitySearchResults", () => {
  it("extracts car results from search HTML", () => {
    const results = parseMobilitySearchResults(carSearchHtml);
    assert.ok(results.length > 0, "should find car results");

    const first = results[0];
    assert.ok(first.finn_code, "should have finn_code");
    assert.ok(first.heading, "should have heading");
    assert.ok(first.price, "should have price");
    assert.ok(first.make, "car should have make");
  });

  it("extracts boat results from search HTML", () => {
    const results = parseMobilitySearchResults(boatSearchHtml);
    assert.ok(results.length > 0, "should find boat results");

    const first = results[0];
    assert.ok(first.finn_code, "should have finn_code");
    assert.ok(first.heading, "should have heading");
  });

  it("returns empty array for empty HTML", () => {
    assert.deepStrictEqual(parseMobilitySearchResults("<html></html>"), []);
  });
});

describe("parseMobilityItemDetail", () => {
  it("extracts car detail with specs", () => {
    const detail = parseMobilityItemDetail(carDetailHtml);
    assert.ok(detail.name, "should have name");
    assert.ok(detail.price, "should have price");
    assert.ok(Object.keys(detail.specs).length > 0, "should have specs");
  });

  it("extracts boat detail with specs", () => {
    const detail = parseMobilityItemDetail(boatDetailHtml);
    assert.ok(detail.name, "should have name");
    assert.ok(Object.keys(detail.specs).length > 0, "should have specs");
  });
});
