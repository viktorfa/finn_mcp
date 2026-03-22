import { z } from "zod";
import { fetchHtml } from "../fetch.js";
import { parseItemDetails, parseSearchResults } from "../torget-parse.js";

export function registerTorgetTools(server) {
  server.registerTool(
    "search_finn_torget",
    {
      description:
        "Search for secondhand items on FINN.no Torget (the general marketplace). Supports categories like electronics, clothing, sports, furniture, etc.",
      inputSchema: {
        query: z.string().optional().describe("Search query"),
        page: z.coerce.number().optional().describe("Page number"),
        sort: z
          .enum(["RELEVANCE", "PUBLISHED_DESC", "PUBLISHED_ASC", "PRICE_ASC", "PRICE_DESC", "CLOSEST"])
          .optional()
          .describe("Sort order"),
        category: z
          .string()
          .optional()
          .describe(
            "Top-level category code: 0.93=Elektronikk, 0.69=Sport/friluft, 0.71=Klær/kosmetikk, 0.78=Møbler/interiør, 0.67=Hage/oppussing, 0.86=Fritid/hobby, 0.68=Foreldre/barn, 0.76=Antikviteter/kunst, 0.77=Dyr/utstyr, 0.91=Næring, 0.90=Bil/båt-utstyr",
          ),
        sub_category: z.string().optional().describe("Sub-category code (depends on selected category)"),
        location: z.string().optional().describe("Location code (e.g. '0.22042' for Agder)"),
        price_from: z.coerce.number().optional().describe("Minimum price (NOK)"),
        price_to: z.coerce.number().optional().describe("Maximum price (NOK)"),
        condition: z
          .array(z.string())
          .optional()
          .describe("Item condition: 1=Helt ny, 2=Som ny, 3=Pent brukt, 4=Godt brukt, 5=Må fikses"),
        trade_type: z.string().optional().describe("Trade type: 1=Til salgs, 2=Gis bort, 3=Ønskes kjøpt"),
        dealer_segment: z.array(z.string()).optional().describe("Seller type: 1=Privat, 3=Forhandler"),
        clothing_size: z.string().optional().describe("Clothing size (XS, S, M, L, XL, 2XL, etc.)"),
        shoe_size: z.coerce.number().optional().describe("Shoe size (EU sizing, e.g. 42, 43, 44, 45)"),
        colour: z
          .array(z.string())
          .optional()
          .describe(
            "Colour filter: 2=Svart, 3=Grå, 4=Hvit, 5=Beige, 6=Gul, 7=Oransje, 8=Rød, 9=Rosa, 10=Blå, 11=Grønn, 12=Brun, 13=Sølv, 14=Gull, 15=Lilla, 1=Flerfarget",
          ),
        shipping: z.boolean().optional().describe("If true, only show items with Fiks ferdig (integrated shipping)"),
        published_today: z.boolean().optional().describe("If true, only show items published today"),
        lat: z.coerce.number().optional().describe("Latitude for location-based search"),
        lon: z.coerce.number().optional().describe("Longitude for location-based search"),
        radius: z.coerce
          .number()
          .optional()
          .describe("Search radius in meters (default 30000). Only used with lat/lon."),
      },
    },
    async (args) => {
      try {
        const params = new URLSearchParams();

        if (args.query) params.append("q", args.query);
        if (args.page && args.page > 1) params.append("page", args.page.toString());
        if (args.sort) params.append("sort", args.sort);
        if (args.category) params.append("category", args.category);
        if (args.sub_category) params.append("sub_category", args.sub_category);
        if (args.location) params.append("location", args.location);
        if (args.price_from) params.append("price_from", args.price_from.toString());
        if (args.price_to) params.append("price_to", args.price_to.toString());
        if (args.condition) {
          for (const c of args.condition) params.append("condition", c);
        }
        if (args.trade_type) params.append("trade_type", args.trade_type);
        if (args.dealer_segment) {
          for (const s of args.dealer_segment) params.append("dealer_segment", s);
        }
        if (args.clothing_size) params.append("clothing_size", args.clothing_size);
        if (args.shoe_size) params.append("shoe_size", args.shoe_size.toString());
        if (args.colour) {
          for (const c of args.colour) params.append("colour", c);
        }
        if (args.shipping) params.append("shipping_types", "0");
        if (args.published_today) params.append("published", "1");
        if (args.lat && args.lon) {
          params.append("lat", args.lat.toString());
          params.append("lon", args.lon.toString());
          params.append("radius", (args.radius || 30000).toString());
        }

        const url = `https://www.finn.no/recommerce/forsale/search?${params.toString()}`;
        const html = await fetchHtml(url);
        const results = parseSearchResults(html);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ search_url: url, total_results: results.length, results }, null, 2),
            },
          ],
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Error searching FINN Torget: ${error.message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    "get_finn_torget_item",
    {
      description: "Get details of a specific Torget item from FINN.no by its FINN-kode (item ID)",
      inputSchema: {
        finn_code: z.string().describe("The FINN-kode (numeric item ID) of the product"),
      },
    },
    async (args) => {
      try {
        const url = `https://www.finn.no/recommerce/forsale/item/${args.finn_code}`;
        const html = await fetchHtml(url);
        const details = parseItemDetails(html);

        return {
          content: [{ type: "text", text: JSON.stringify({ finn_code: args.finn_code, url, ...details }, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching FINN Torget item: ${error.message}` }],
          isError: true,
        };
      }
    },
  );
}
