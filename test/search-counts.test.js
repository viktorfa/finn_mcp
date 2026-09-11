import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { extractFinnSearchData, parseFinnSearchPaging } from "../src/finn-search-data.js";
import { parseMobilitySearchResults } from "../src/mobility-parse.js";
import { registerTools } from "../src/tools/index.js";
import { parseSearchResults } from "../src/torget-parse.js";

const tools = new Map();
registerTools({ registerTool: (name, _config, handler) => tools.set(name, handler) });
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8");
const script = (data) => `<script>${Buffer.from(JSON.stringify(data)).toString("base64")}</script>`;
const searchScript = (metadata, docs = []) =>
  script({ queries: [{ queryKey: [{ scope: "search" }], state: { data: { docs, metadata } } }] });

for (const [name, tool, total, pages, count] of [
  ["search", "search_finn_torget", 3917, 50, 53],
  ["mobility-search-car", "search_finn_cars", 1873, 39, 49],
  ["mobility-search-boat", "search_finn_boats", 32, 1, 32],
  ["mobility-search-car", "search_finn_b2b", 1873, 39, 49],
]) {
  test(`${tool} separates total matches from returned entries`, async (t) => {
    // B2B uses the same mobility response parser; exercise it with the car payload.
    const html = fixture(name);
    assert.deepEqual(parseFinnSearchPaging(html), { total_results: total, page: 1, total_pages: pages });
    t.mock.method(globalThis, "fetch", async () => new Response(html));
    const result = await tools.get(tool)({ query: "test", subvertical: "construction" });
    assert.ok(!result.isError);
    const data = JSON.parse(result.content[0].text);
    assert.equal(data.total_results, total);
    assert.equal(data.page, 1);
    assert.equal(data.total_pages, pages);
    assert.equal(data.results_on_page, count);
    assert.equal(data.results_on_page, data.results.length);
  });
}

test("Klarna reports only the returned count", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(fixture("klarna-search")));
  const result = await tools.get("search_klarna")({ query: "test" });
  assert.ok(!result.isError);
  const data = JSON.parse(result.content[0].text);
  assert.ok(data.results_on_page > 0);
  assert.equal(data.results_on_page, data.results.length);
  assert.equal(Object.hasOwn(data, "total_results"), false);
});

test("missing or malformed metadata stays unknown even when listings exist", () => {
  for (const html of [
    "<html></html>",
    "<script>eynotvalidjson</script>",
    script({ queries: {} }),
    searchScript(undefined, [{ id: 123, heading: "Test" }]),
    searchScript({ result_size: { match_count: -1 }, paging: { current: 0, last: "50" } }),
    searchScript({ result_size: { match_count: 1.5 }, paging: { current: "2", last: -1 } }),
  ]) {
    assert.deepEqual(parseFinnSearchPaging(html), { total_results: null, page: null, total_pages: null });
  }
});

test("small zero-result payloads retain explicit zero counts", () => {
  const html = searchScript({ result_size: { match_count: 0 }, paging: { current: 1, last: 0 } });
  assert.deepEqual(parseFinnSearchPaging(html), { total_results: 0, page: 1, total_pages: 0 });
  assert.deepEqual(parseSearchResults(html), []);
  assert.deepEqual(parseMobilitySearchResults(html), []);
});

test("later-page metadata comes from the search query, skipping unrelated scripts and queries", () => {
  const html =
    script({ queries: [{ queryKey: [{ scope: "other" }], state: { data: { docs: [{ id: 999 }] } } }] }) +
    searchScript({ result_size: { match_count: 1000 }, paging: { current: 7, last: 20 } }, [
      { id: 123, heading: "Test" },
    ]);
  assert.deepEqual(parseFinnSearchPaging(html), { total_results: 1000, page: 7, total_pages: 20 });
  assert.equal(extractFinnSearchData(html).docs.length, 1);
  assert.equal(parseSearchResults(html)[0].finn_code, "123");
  assert.equal(parseMobilitySearchResults(html)[0].finn_code, "123");
});
