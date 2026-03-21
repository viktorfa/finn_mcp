#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fetch from "node-fetch";
import { z } from "zod";
import { parseHolidayDetail } from "./holiday-parse.js";
import { parseKlarnaProductDetail, parseKlarnaSearchResults } from "./klarna-parse.js";
import { parseMobilityItemDetail, parseMobilitySearchResults } from "./mobility-parse.js";
import { parseItemDetails, parseSearchResults } from "./parse.js";

const server = new McpServer({
  name: "finn-mcp-server",
  version: "1.0.0",
});

const FINN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

server.registerTool(
  "search_finn_torget",
  {
    description:
      "Search for secondhand items on FINN.no Torget (the general marketplace). Supports categories like electronics, clothing, sports, furniture, etc.",
    inputSchema: {
      query: z.string().optional().describe("Search query"),
      page: z.number().optional().default(1).describe("Page number"),
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
      price_from: z.number().optional().describe("Minimum price (NOK)"),
      price_to: z.number().optional().describe("Maximum price (NOK)"),
      condition: z
        .array(z.string())
        .optional()
        .describe("Item condition: 1=Helt ny, 2=Som ny, 3=Pent brukt, 4=Godt brukt, 5=Må fikses"),
      trade_type: z.string().optional().describe("Trade type: 1=Til salgs, 2=Gis bort, 3=Ønskes kjøpt"),
      dealer_segment: z.array(z.string()).optional().describe("Seller type: 1=Privat, 3=Forhandler"),
      clothing_size: z.string().optional().describe("Clothing size (XS, S, M, L, XL, 2XL, etc.)"),
      colour: z
        .array(z.string())
        .optional()
        .describe(
          "Colour filter: 2=Svart, 3=Grå, 4=Hvit, 5=Beige, 6=Gul, 7=Oransje, 8=Rød, 9=Rosa, 10=Blå, 11=Grønn, 12=Brun, 13=Sølv, 14=Gull, 15=Lilla, 1=Flerfarget",
        ),
      shipping: z.boolean().optional().describe("If true, only show items with Fiks ferdig (integrated shipping)"),
      published_today: z.boolean().optional().describe("If true, only show items published today"),
      lat: z.number().optional().describe("Latitude for location-based search"),
      lon: z.number().optional().describe("Longitude for location-based search"),
      radius: z.number().optional().default(30000).describe("Search radius in meters"),
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
      if (args.colour) {
        for (const c of args.colour) params.append("colour", c);
      }
      if (args.shipping) params.append("shipping_types", "0");
      if (args.published_today) params.append("published", "1");
      if (args.lat) params.append("lat", args.lat.toString());
      if (args.lon) params.append("lon", args.lon.toString());
      if (args.radius) params.append("radius", args.radius.toString());

      const url = `https://www.finn.no/recommerce/forsale/search?${params.toString()}`;

      const response = await fetch(url, {
        headers: { "User-Agent": FINN_UA },
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
            text: JSON.stringify({ search_url: url, total_results: results.length, results }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error searching FINN Torget: ${error.message}` }],
        isError: true,
      };
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
      const finnCode = args.finn_code;
      const url = `https://www.finn.no/recommerce/forsale/item/${finnCode}`;

      const response = await fetch(url, { headers: { "User-Agent": FINN_UA } });

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

function buildMobilitySearchUrl(subvertical, args) {
  const params = new URLSearchParams();
  if (args.query) params.append("q", args.query);
  if (args.page && args.page > 1) params.append("page", args.page.toString());
  if (args.sort) params.append("sort", args.sort);
  if (args.price_from) params.append("price_from", args.price_from.toString());
  if (args.price_to) params.append("price_to", args.price_to.toString());
  if (args.year_from) params.append("year_from", args.year_from.toString());
  if (args.year_to) params.append("year_to", args.year_to.toString());
  if (args.dealer_segment) params.append("dealer_segment", args.dealer_segment);
  return { base: `https://www.finn.no/mobility/search/${subvertical}`, params };
}

async function fetchAndParseMobilitySearch(subvertical, args, extraParams) {
  const { base, params } = buildMobilitySearchUrl(subvertical, args);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v != null) params.append(k, v.toString());
    }
  }
  const url = `${base}?${params.toString()}`;
  const response = await fetch(url, { headers: { "User-Agent": FINN_UA } });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const html = await response.text();
  const results = parseMobilitySearchResults(html);
  return { search_url: url, total_results: results.length, results };
}

server.registerTool(
  "search_finn_cars",
  {
    description: "Search for cars on FINN.no. Returns listings with price, year, mileage, make, model, fuel type etc.",
    inputSchema: {
      query: z.string().optional().describe("Search query (e.g. 'tesla model 3')"),
      page: z.number().optional().default(1).describe("Page number"),
      sort: z
        .enum([
          "RELEVANCE",
          "PUBLISHED_DESC",
          "PRICE_ASC",
          "PRICE_DESC",
          "YEAR_ASC",
          "YEAR_DESC",
          "MILEAGE_ASC",
          "MILEAGE_DESC",
        ])
        .optional()
        .describe("Sort order"),
      price_from: z.number().optional().describe("Minimum price (NOK)"),
      price_to: z.number().optional().describe("Maximum price (NOK)"),
      year_from: z.number().optional().describe("Minimum model year"),
      year_to: z.number().optional().describe("Maximum model year"),
      mileage_from: z.number().optional().describe("Minimum mileage (km)"),
      mileage_to: z.number().optional().describe("Maximum mileage (km)"),
      fuel: z.string().optional().describe("Fuel type (e.g. 'Elektrisk', 'Diesel', 'Bensin')"),
      body_type: z.string().optional().describe("Body type (e.g. 'SUV', 'Sedan', 'Stasjonsvogn')"),
      transmission: z.string().optional().describe("Transmission ('Automat' or 'Manuell')"),
      wheel_drive: z.string().optional().describe("Wheel drive ('Firehjulsdrift', 'Forhjulsdrift', 'Bakhjulsdrift')"),
      dealer_segment: z.string().optional().describe("Seller type ('Privat' or 'Forhandler')"),
    },
  },
  async (args) => {
    try {
      const extra = {};
      if (args.mileage_from) extra.mileage_from = args.mileage_from;
      if (args.mileage_to) extra.mileage_to = args.mileage_to;
      if (args.fuel) extra.fuel = args.fuel;
      if (args.body_type) extra.body_type = args.body_type;
      if (args.transmission) extra.transmission = args.transmission;
      if (args.wheel_drive) extra.wheel_drive = args.wheel_drive;
      const data = await fetchAndParseMobilitySearch("car", args, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error searching FINN cars: ${error.message}` }], isError: true };
    }
  },
);

server.registerTool(
  "search_finn_boats",
  {
    description:
      "Search for boats on FINN.no. Returns listings with price, year, length, engine specs, boat class etc.",
    inputSchema: {
      query: z.string().optional().describe("Search query (e.g. 'bayliner')"),
      page: z.number().optional().default(1).describe("Page number"),
      sort: z
        .enum(["RELEVANCE", "PUBLISHED_DESC", "PRICE_ASC", "PRICE_DESC", "YEAR_ASC", "YEAR_DESC"])
        .optional()
        .describe("Sort order"),
      price_from: z.number().optional().describe("Minimum price (NOK)"),
      price_to: z.number().optional().describe("Maximum price (NOK)"),
      year_from: z.number().optional().describe("Minimum model year"),
      year_to: z.number().optional().describe("Maximum model year"),
      length_feet_from: z.number().optional().describe("Minimum length (feet)"),
      length_feet_to: z.number().optional().describe("Maximum length (feet)"),
      motor_size_from: z.number().optional().describe("Minimum engine power (HP)"),
      motor_size_to: z.number().optional().describe("Maximum engine power (HP)"),
      sales_form: z.string().optional().describe("Sales form (e.g. 'Brukt', 'Ny')"),
      class: z.string().optional().describe("Boat class (e.g. 'Cabincruiser', 'Seilbåt', 'RIB', 'Daycruiser')"),
      motor_type: z.string().optional().describe("Engine type ('Innenbords' or 'Utenbords')"),
      motor_fuel: z.string().optional().describe("Fuel type ('Bensin', 'Diesel', 'El')"),
      dealer_segment: z.string().optional().describe("Seller type ('Privat' or 'Forhandler')"),
    },
  },
  async (args) => {
    try {
      const extra = {};
      if (args.length_feet_from) extra.length_feet_from = args.length_feet_from;
      if (args.length_feet_to) extra.length_feet_to = args.length_feet_to;
      if (args.motor_size_from) extra.motor_size_from = args.motor_size_from;
      if (args.motor_size_to) extra.motor_size_to = args.motor_size_to;
      if (args.sales_form) extra.sales_form = args.sales_form;
      if (args.class) extra.class = args.class;
      if (args.motor_type) extra.motor_type = args.motor_type;
      if (args.motor_fuel) extra.motor_fuel = args.motor_fuel;
      const data = await fetchAndParseMobilitySearch("boat", args, extra);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error searching FINN boats: ${error.message}` }], isError: true };
    }
  },
);

server.registerTool(
  "get_finn_mobility_item",
  {
    description:
      "Get details of a car or boat listing on FINN.no by its FINN-kode. Returns specs, description, images, and price.",
    inputSchema: {
      finn_code: z.string().describe("The FINN-kode (numeric item ID)"),
    },
  },
  async (args) => {
    try {
      const url = `https://www.finn.no/mobility/item/${args.finn_code}`;
      const response = await fetch(url, { headers: { "User-Agent": FINN_UA } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();
      const details = parseMobilityItemDetail(html);
      return {
        content: [{ type: "text", text: JSON.stringify({ finn_code: args.finn_code, url, ...details }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching FINN mobility item: ${error.message}` }],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "search_finn_holiday_autocomplete",
  {
    description:
      "Search for holiday home destinations on FINN.no. Returns destination suggestions with result counts. Use this to discover locations before looking up specific holiday homes.",
    inputSchema: {
      query: z.string().describe("Destination search query (e.g. 'lofoten', 'trysil', 'bergen')"),
    },
  },
  async (args) => {
    try {
      const url = `https://www.finn.no/travel-api/fhh/autocomplete?query=${encodeURIComponent(args.query)}`;
      const response = await fetch(url, { headers: { "User-Agent": FINN_UA } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error searching FINN holiday destinations: ${error.message}` }],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "get_finn_holiday_home",
  {
    description:
      "Get details of a holiday home/cabin rental on FINN.no by its FINN-kode. Returns pricing, location, facilities, beds, images etc.",
    inputSchema: {
      finn_code: z.string().describe("The FINN-kode (numeric item ID) of the holiday home"),
    },
  },
  async (args) => {
    try {
      const url = `https://www.finn.no/reise/feriehus-hytteutleie/ad.html?finnkode=${args.finn_code}`;
      const response = await fetch(url, { headers: { "User-Agent": FINN_UA } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();
      const details = parseHolidayDetail(html);
      if (!details) throw new Error("Could not parse holiday home data");
      return { content: [{ type: "text", text: JSON.stringify({ url, ...details }, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error fetching FINN holiday home: ${error.message}` }],
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
