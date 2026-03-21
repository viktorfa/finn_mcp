import { z } from "zod";
import { fetchHtml } from "../fetch.js";
import { parseKlarnaProductDetail, parseKlarnaSearchResults } from "../klarna-parse.js";

export function registerKlarnaTools(server) {
  server.registerTool(
    "search_klarna",
    {
      description:
        "Search for new products on Klarna Price Guide (prisguiden.no). Returns product names, lowest prices across Norwegian retailers, and price drop info.",
      inputSchema: {
        query: z.string().describe("Search query"),
      },
    },
    async (args) => {
      try {
        const url = `https://www.klarna.com/no/shopping/results?q=${encodeURIComponent(args.query)}`;
        const html = await fetchHtml(url);
        const results = parseKlarnaSearchResults(html);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ search_url: url, total_results: results.length, results }, null, 2),
            },
          ],
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Error searching Klarna: ${error.message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    "get_klarna_product",
    {
      description:
        "Get details of a specific product on Klarna Price Guide, including all merchant offers with prices sorted cheapest first, and price trend data.",
      inputSchema: {
        url: z
          .string()
          .describe(
            "The full Klarna product URL, e.g. https://www.klarna.com/no/shopping/pl/cl10012/4959277/Ettkortsdatamaskiner/Raspberry-Pi-4-Model-B-4GB/",
          ),
      },
    },
    async (args) => {
      try {
        const html = await fetchHtml(args.url);
        const details = parseKlarnaProductDetail(html);

        return {
          content: [{ type: "text", text: JSON.stringify({ url: args.url, ...details }, null, 2) }],
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Error fetching Klarna product: ${error.message}` }], isError: true };
      }
    },
  );
}
