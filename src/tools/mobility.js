import { z } from "zod";
import { fetchHtml } from "../fetch.js";
import { parseMobilityItemDetail, parseMobilitySearchResults } from "../mobility-parse.js";

function buildSearchUrl(subvertical, args, extraParams) {
  const params = new URLSearchParams();
  if (args.query) params.append("q", args.query);
  if (args.page && args.page > 1) params.append("page", args.page.toString());
  if (args.sort) params.append("sort", args.sort);
  if (args.price_from) params.append("price_from", args.price_from.toString());
  if (args.price_to) params.append("price_to", args.price_to.toString());
  if (args.year_from) params.append("year_from", args.year_from.toString());
  if (args.year_to) params.append("year_to", args.year_to.toString());
  if (args.dealer_segment) params.append("dealer_segment", args.dealer_segment);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v != null) params.append(k, v.toString());
    }
  }
  return `https://www.finn.no/mobility/search/${subvertical}?${params.toString()}`;
}

async function searchMobility(subvertical, args, extraParams) {
  const url = buildSearchUrl(subvertical, args, extraParams);
  const html = await fetchHtml(url);
  const results = parseMobilitySearchResults(html);
  return { search_url: url, total_results: results.length, results };
}

export function registerMobilityTools(server) {
  server.registerTool(
    "search_finn_cars",
    {
      description:
        "Search for cars on FINN.no. Returns listings with price, year, mileage, make, model, fuel type etc.",
      inputSchema: {
        query: z.string().optional().describe("Search query (e.g. 'tesla model 3')"),
        page: z.coerce.number().optional().describe("Page number"),
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
        price_from: z.coerce.number().optional().describe("Minimum price (NOK)"),
        price_to: z.coerce.number().optional().describe("Maximum price (NOK)"),
        year_from: z.coerce.number().optional().describe("Minimum model year"),
        year_to: z.coerce.number().optional().describe("Maximum model year"),
        mileage_from: z.coerce.number().optional().describe("Minimum mileage (km)"),
        mileage_to: z.coerce.number().optional().describe("Maximum mileage (km)"),
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
        const data = await searchMobility("car", args, extra);
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
        page: z.coerce.number().optional().describe("Page number"),
        sort: z
          .enum(["RELEVANCE", "PUBLISHED_DESC", "PRICE_ASC", "PRICE_DESC", "YEAR_ASC", "YEAR_DESC"])
          .optional()
          .describe("Sort order"),
        price_from: z.coerce.number().optional().describe("Minimum price (NOK)"),
        price_to: z.coerce.number().optional().describe("Maximum price (NOK)"),
        year_from: z.coerce.number().optional().describe("Minimum model year"),
        year_to: z.coerce.number().optional().describe("Maximum model year"),
        length_feet_from: z.coerce.number().optional().describe("Minimum length (feet)"),
        length_feet_to: z.coerce.number().optional().describe("Maximum length (feet)"),
        motor_size_from: z.coerce.number().optional().describe("Minimum engine power (HP)"),
        motor_size_to: z.coerce.number().optional().describe("Maximum engine power (HP)"),
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
        const data = await searchMobility("boat", args, extra);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error searching FINN boats: ${error.message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    "search_finn_b2b",
    {
      description:
        "Search FINN.no Næring (B2B) for commercial vehicles and machinery: excavators, forklifts, trucks, buses, tractors, harvesters, agricultural tools. Returns listings with price, year, make, model, location.\n\n" +
        "Construction segments (use with subvertical='construction'): 8003=Gravemaskin (excavator), 8005=Gaffeltruck (forklift), 8004=Hjullaster (wheel loader), 8001=Dumper, 8002=Veihøvel, 8006=Tilhenger, 8007=Tilbehør.\n\n" +
        "Common construction make codes: Kubota=8034, Cat=8017, Hitachi=8025, Volvo=190, Komatsu=8033, Kobelco=8031, Takeuchi=8051, Liebherr=8036, Doosan=8340, Toyota=8264 (forklift), Bobcat=8015, Linde=460, Hyster=510, Andre=200.",
      inputSchema: {
        subvertical: z
          .enum(["construction", "truck", "bus", "agriculturetractor", "agriculturecombines", "agriculturetools"])
          .describe(
            "B2B subvertical: 'construction' for excavators/forklifts/loaders, 'truck' for lastebil, 'bus' for buss, 'agriculturetractor' for landbrukstraktor, 'agriculturecombines' for skurtreskere, 'agriculturetools' for landbruksredskap",
          ),
        query: z.string().optional().describe("Free-text search query (e.g. 'minigraver')"),
        page: z.coerce.number().optional().describe("Page number"),
        sort: z
          .enum(["RELEVANCE", "CLOSEST", "PUBLISHED_DESC", "PRICE_ASC", "PRICE_DESC", "YEAR_ASC", "YEAR_DESC"])
          .optional()
          .describe("Sort order"),
        price_from: z.coerce.number().optional().describe("Minimum price (NOK)"),
        price_to: z.coerce.number().optional().describe("Maximum price (NOK)"),
        year_from: z.coerce.number().optional().describe("Minimum model year"),
        year_to: z.coerce.number().optional().describe("Maximum model year"),
        engine_effect_from: z.coerce.number().optional().describe("Minimum engine power (HP)"),
        engine_effect_to: z.coerce.number().optional().describe("Maximum engine power (HP)"),
        dealer_segment: z.string().optional().describe("Seller type ('Privat' or 'Forhandler')"),
        construction_segment: z
          .string()
          .optional()
          .describe(
            "Sub-type code, only for subvertical='construction'. 8003=Gravemaskin, 8005=Gaffeltruck, 8004=Hjullaster, 8001=Dumper",
          ),
        make: z
          .string()
          .optional()
          .describe(
            "Make code (depends on subvertical). For construction excavators: Kubota=8034, Cat=8017, Hitachi=8025, Volvo=190, Komatsu=8033, Takeuchi=8051",
          ),
      },
    },
    async (args) => {
      try {
        const extra = {};
        if (args.engine_effect_from) extra.engine_effect_from = args.engine_effect_from;
        if (args.engine_effect_to) extra.engine_effect_to = args.engine_effect_to;
        if (args.construction_segment) extra.construction_segment = args.construction_segment;
        if (args.make) extra.make = args.make;
        const data = await searchMobility(`b2b/${args.subvertical}`, args, extra);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error searching FINN B2B: ${error.message}` }], isError: true };
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
        const html = await fetchHtml(url);
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
}
