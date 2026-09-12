import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseKlarnaProductDetail, parseKlarnaSearchResults } from "../src/klarna-parse.js";
import { parseMobilitySearchResults } from "../src/mobility-parse.js";
import { registerTools } from "../src/tools/index.js";
import { parseSearchResults } from "../src/torget-parse.js";

const klarna = (queries) => `<script>${JSON.stringify({ __DEHYDRATED_QUERY_STATE__: { queries } })}</script>`;
const query = (key, data) => ({ queryKey: [key], state: { data } });
const detail = (data) =>
  klarna([
    query("product-detail-initial", { product: { name: "Test product" } }),
    query("product-detail-offers", data),
  ]);

test("saved Klarna offers retain stock, shipping, merchant and purchase link without sponsored duplicates", () => {
  const html = readFileSync(new URL("./fixtures/klarna-detail.html", import.meta.url), "utf8");
  const { offers } = parseKlarnaProductDetail(html);
  assert.equal(offers.length, 9);
  const cheapest = offers[0];
  assert.equal(cheapest.merchant, "Nerdshop");
  assert.deepEqual(cheapest.price, { amount: 1199, currency: "NOK" });
  assert.deepEqual(cheapest.shipping_cost, { amount: 59, currency: "NOK" });
  assert.deepEqual(cheapest.total_price, { amount: 1258, currency: "NOK" });
  assert.equal(cheapest.stock_status, "OUT_OF_STOCK");
  assert.deepEqual(cheapest.delivery_time, { min_days: 2, max_days: 5 });
  assert.match(cheapest.url, /^https:\/\/www.klarna.com\/no\/api\/frontend-transition-page\//);
  const proshop = offers.find((o) => o.merchant === "Proshop.no");
  assert.equal(proshop.shipping_cost.amount, 0);
  assert.equal(proshop.total_price.amount, 1899);
});

test("missing stock is unknown; known true and false remain distinct", () => {
  const html = klarna([
    query("serp-search", {
      pages: [
        {
          products: [
            { id: 1 },
            { id: 2, outOfStock: true },
            { id: 3, outOfStock: false },
            { id: 4, outOfStock: "false" },
          ],
        },
      ],
    }),
  ]);
  assert.deepEqual(
    parseKlarnaSearchResults(html).map((p) => p.out_of_stock),
    [null, true, false, null],
  );
});

test("offer totals require known matching currencies and missing stock stays unknown", () => {
  const { offers } = parseKlarnaProductDetail(
    detail({
      offers: [
        { id: "missing", price: { amount: "10", currency: "NOK" }, deliveryTime: { minDays: 1, maxDays: 3 } },
        { id: "mismatch", price: { amount: "20", currency: "NOK" }, shippingCost: { amount: "5", currency: "EUR" } },
        { id: "invalid", price: { amount: "garbage", currency: "NOK" } },
      ],
      staticOffers: [
        { id: "zero", price: { amount: "0", currency: "NOK" }, shippingCost: { amount: "0", currency: "NOK" } },
      ],
    }),
  );
  assert.deepEqual(
    offers.map((o) => o.id),
    ["zero", "missing", "mismatch", "invalid"],
  );
  assert.deepEqual(offers[0].total_price, { amount: 0, currency: "NOK" });
  assert.equal(offers[1].shipping_cost, null);
  assert.equal(offers[1].stock_status, null);
  assert.equal(offers[1].total_price, null);
  assert.equal(offers[2].total_price, null);
  assert.equal(offers[3].price, null);
});

test("Klarna accepts recognised empty results but rejects absent or malformed payloads", () => {
  assert.deepEqual(parseKlarnaSearchResults(klarna([query("serp-search", { pages: [{ products: [] }] })])), []);
  for (const html of [
    "<html>Access denied</html>",
    klarna([]),
    klarna([query("serp-search", {})]),
    klarna([query("serp-search", { pages: [{}] })]),
  ]) {
    assert.throws(() => parseKlarnaSearchResults(html), /parse/i);
  }
  assert.throws(() => parseKlarnaProductDetail("<html>Access denied</html>"), /parse/i);
  assert.throws(() => parseKlarnaProductDetail(detail({})), /parse/i);
  assert.deepEqual(parseKlarnaProductDetail(detail({ offers: [] })).offers, []);
});

test("FINN recognises empty searches and rejects challenge pages", () => {
  const html = `<script>${Buffer.from(
    JSON.stringify({ queries: [{ queryKey: [{ scope: "search" }], state: { data: { docs: [] } } }] }),
  ).toString("base64")}</script>`;
  for (const parse of [parseSearchResults, parseMobilitySearchResults]) {
    assert.deepEqual(parse(html), []);
    assert.throws(() => parse("<html>Verify you are human</html>"), /parse/i);
  }
});

test("shared tool handlers report parsing failures as errors", async (t) => {
  const tools = new Map();
  registerTools({ registerTool: (name, _config, handler) => tools.set(name, handler) });
  t.mock.method(globalThis, "fetch", async () => new Response("<html>Access denied</html>"));
  for (const name of [
    "search_klarna",
    "get_klarna_product",
    "search_finn_torget",
    "search_finn_cars",
    "search_finn_boats",
    "search_finn_b2b",
  ]) {
    const result = await tools.get(name)({
      query: "test",
      url: "https://www.klarna.com/no/shopping/test",
      subvertical: "construction",
    });
    assert.equal(result.isError, true, name);
    assert.match(result.content[0].text, /parse/i);
  }
});
