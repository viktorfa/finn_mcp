import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function run(args, response = { status: 200 }) {
  const setup = `import { readFileSync } from "node:fs";
    globalThis.fetch = async () => new Response(
      ${response.body === undefined ? `readFileSync(${JSON.stringify(response.fixture ?? "test/fixtures/search.html")}, "utf8")` : JSON.stringify(response.body)},
      { status: ${response.status} });`;
  return spawnSync(
    process.execPath,
    ["--import", `data:text/javascript,${encodeURIComponent(setup)}`, "src/cli.js", ...args],
    {
      encoding: "utf8",
    },
  );
}

test("CLI discovers tools and describes their parameters", () => {
  const list = run(["--help"]);
  assert.equal(list.status, 0);
  assert.match(list.stdout, /search_finn_b2b/);
  const help = run(["search_finn_torget", "--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--price_to <number>/);
  assert.match(help.stdout, /repeatable/);
});

test("CLI flags and JSON produce identical results through the marketplace handler", () => {
  const flags = run([
    "search_finn_torget",
    "--query",
    "jakke",
    "--price_to",
    "1500",
    "--condition",
    "2",
    "--condition",
    "3",
    "--shipping",
  ]);
  const json = run([
    "search_finn_torget",
    "--json",
    JSON.stringify({
      query: "jakke",
      price_to: 1500,
      condition: ["2", "3"],
      shipping: true,
    }),
  ]);
  assert.equal(flags.status, 0, flags.stderr);
  assert.equal(json.status, 0, json.stderr);
  assert.equal(flags.stdout, json.stdout);
  assert.equal(flags.stderr, "");
  const result = JSON.parse(flags.stdout);
  assert.equal(result.total_results, 3917);
  assert.equal(result.page, 1);
  assert.equal(result.total_pages, 50);
  assert.equal(result.results_on_page, result.results.length);
  const url = new URL(result.search_url);
  assert.equal(url.searchParams.get("price_to"), "1500");
  assert.deepEqual(url.searchParams.getAll("condition"), ["2", "3"]);
  assert.equal(url.searchParams.get("shipping_types"), "0");
  assert.ok(result.results.length > 0);
});

test("CLI rejects invalid inputs without printing results", () => {
  for (const args of [
    ["missing"],
    ["get_finn_torget_item"],
    ["search_finn_torget", "--sort", "invalid"],
    ["search_finn_torget", "--price_to", "oops"],
    ["search_finn_torget", "--unknown", "value"],
    ["search_finn_torget", "--json", "{"],
    ["search_finn_torget", "--json", '{"unknown":true}'],
    ["search_finn_torget", "--json", "{}", "--query", "jakke"],
  ]) {
    const result = run(args);
    assert.equal(result.status, 1, args.join(" "));
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.length > 0);
  }
});

test("CLI reports upstream failures on stderr with a failing exit status", () => {
  const result = run(["search_finn_torget"], { body: "Unavailable", status: 503 });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /503/);
});

test("CLI emits offer data as JSON and reports unrecognised pages only on stderr", () => {
  const args = ["get_klarna_product", "--url", "https://www.klarna.com/no/shopping/test"];
  const success = run(args, {
    status: 200,
    fixture: "test/fixtures/klarna-detail.html",
  });
  assert.equal(success.status, 0, success.stderr);
  assert.equal(success.stderr, "");
  const { offers } = JSON.parse(success.stdout);
  assert.equal(offers.length, 9);
  assert.equal(offers[0].stock_status, "OUT_OF_STOCK");
  assert.equal(offers[0].total_price.amount, 1258);
  for (const command of [args, ["search_finn_torget"], ["search_klarna", "--query", "test"]]) {
    const failure = run(command, { status: 200, body: "<html>Verify you are human</html>" });
    assert.equal(failure.status, 1);
    assert.equal(failure.stdout, "");
    assert.match(failure.stderr, /Cannot parse/);
  }
});
