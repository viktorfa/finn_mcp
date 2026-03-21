import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseHolidayDetail } from "../src/holiday-parse.js";

const detailHtml = readFileSync(new URL("./fixtures/holiday-detail.html", import.meta.url), "utf-8");

describe("parseHolidayDetail", () => {
  it("extracts holiday home details from __NEXT_DATA__", () => {
    const detail = parseHolidayDetail(detailHtml);
    assert.ok(detail, "should return data");
    assert.ok(detail.heading, "should have heading");
    assert.ok(detail.beds, "should have beds");
    assert.ok(detail.bedrooms, "should have bedrooms");
    assert.ok(detail.pricing, "should have pricing");
    assert.ok(detail.location, "should have location");
    assert.ok(detail.facilities.length > 0, "should have facilities");
  });

  it("returns null for HTML without __NEXT_DATA__", () => {
    assert.strictEqual(parseHolidayDetail("<html></html>"), null);
  });
});
