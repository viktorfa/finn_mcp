#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fetch from "node-fetch";
import { z } from "zod";
import { parseKlarnaProductDetail, parseKlarnaSearchResults } from "./klarna-parse.js";
import { parseItemDetails, parseSearchResults } from "./parse.js";

const server = new McpServer({
  name: "finn-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "search_finn",
  {
    description: "Search for products on FINN.no marketplace",
    inputSchema: {
      query: z.string().optional().describe("Search query"),
      page: z.number().optional().default(1).describe("Page number (optional)"),
      sort: z
        .enum(["RELEVANCE", "PUBLISHED_DESC", "PUBLISHED_ASC", "PRICE_ASC", "PRICE_DESC", "CLOSEST"])
        .optional()
        .describe(
          "Sort order: RELEVANCE (default), PUBLISHED_DESC (newest), PUBLISHED_ASC (oldest), PRICE_ASC (cheapest), PRICE_DESC (most expensive), CLOSEST (requires lat/lon)",
        ),
      clothing_size: z.string().optional().describe("Clothing size filter (e.g., XS, S, M, L, XL, XXL)"),
      price_from: z.number().optional().describe("Minimum price"),
      price_to: z.number().optional().describe("Maximum price"),
      condition: z
        .array(z.enum(["1", "2", "3", "4", "5"]).transform(Number))
        .optional()
        .describe(
          "Item condition: 1=Helt ny (uåpnet/med lapp), 2=Som ny (ikke synlig brukt), 3=Pent brukt (i god stand), 4=Brukt (noe slitasje), 5=Til deler/reparasjon",
        ),
      trade_type: z
        .enum(["1", "2", "3"])
        .transform(Number)
        .optional()
        .describe("Trade type: 1=Til salgs (for sale), 2=Gis bort (giving away/free), 3=Ønskes kjøpt (wanted)"),
      dealer_segment: z
        .array(z.enum(["1", "3"]).transform(Number))
        .optional()
        .describe("Seller type filter: 1=Private individuals, 3=Businesses/dealers. Can specify multiple."),
      lat: z.number().optional().describe("Latitude for location-based search"),
      lon: z.number().optional().describe("Longitude for location-based search"),
      radius: z.number().optional().default(30000).describe("Search radius in meters (e.g., 30000 for 30km)"),
    },
  },
  async (args) => {
    try {
      const params = new URLSearchParams();

      if (args.query) {
        params.append("q", args.query);
      }
      if (args.page && args.page > 1) {
        params.append("page", args.page.toString());
      }
      if (args.sort) {
        params.append("sort", args.sort);
      }
      if (args.clothing_size) {
        params.append("clothing_size", args.clothing_size);
      }
      if (args.price_from) {
        params.append("price_from", args.price_from.toString());
      }
      if (args.price_to) {
        params.append("price_to", args.price_to.toString());
      }
      if (args.condition && Array.isArray(args.condition)) {
        args.condition.forEach((cond) => {
          params.append("condition", cond.toString());
        });
      }
      if (args.trade_type) {
        params.append("trade_type", args.trade_type.toString());
      }
      if (args.dealer_segment && Array.isArray(args.dealer_segment)) {
        args.dealer_segment.forEach((segment) => {
          params.append("dealer_segment", segment.toString());
        });
      }
      if (args.lat) {
        params.append("lat", args.lat.toString());
      }
      if (args.lon) {
        params.append("lon", args.lon.toString());
      }
      if (args.radius) {
        params.append("radius", args.radius.toString());
      }

      const url = `https://www.finn.no/recommerce/forsale/search?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const results = parseSearchResults(html);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                search_url: url,
                total_results: results.length,
                results: results,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching FINN.no: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "get_finn_item",
  {
    description: "Get details of a specific item from FINN.no by its FINN-kode (item ID)",
    inputSchema: {
      finn_code: z.string().describe("The FINN-kode (numeric item ID) of the product"),
    },
  },
  async (args) => {
    try {
      const finnCode = args.finn_code;
      const url = `https://www.finn.no/recommerce/forsale/item/${finnCode}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const details = parseItemDetails(html);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                finn_code: finnCode,
                url: url,
                ...details,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching FINN.no item: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

const KLARNA_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

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

      const response = await fetch(url, { headers: { "User-Agent": KLARNA_UA } });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
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
      return {
        content: [{ type: "text", text: `Error searching Klarna: ${error.message}` }],
        isError: true,
      };
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
      const response = await fetch(args.url, { headers: { "User-Agent": KLARNA_UA } });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const details = parseKlarnaProductDetail(html);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ url: args.url, ...details }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching Klarna product: ${error.message}` }],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FINN.no MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
