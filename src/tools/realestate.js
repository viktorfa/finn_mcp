import { z } from "zod";
import { fetchHtml } from "../fetch.js";
import {
  parseRealestateDetail,
  parseRealestateLocationFilters,
  parseRealestateSearchResults,
} from "../realestate-parse.js";

const HOMES_SEARCH_URL = "https://www.finn.no/realestate/homes/search.html";

function buildHomesSearchUrl(args) {
  const params = new URLSearchParams();

  if (args.query) params.append("q", args.query);
  if (args.location) params.append("location", args.location);
  if (args.page && args.page > 1) params.append("page", args.page.toString());
  if (args.sort) params.append("sort", args.sort);
  if (args.property_type) params.append("property_type", args.property_type);
  if (args.price_from) params.append("price_from", args.price_from.toString());
  if (args.price_to) params.append("price_to", args.price_to.toString());
  if (args.price_total_from) params.append("price_total_from", args.price_total_from.toString());
  if (args.price_total_to) params.append("price_total_to", args.price_total_to.toString());
  if (args.rent_from) params.append("rent_from", args.rent_from.toString());
  if (args.rent_to) params.append("rent_to", args.rent_to.toString());
  if (args.area_from) params.append("area_from", args.area_from.toString());
  if (args.area_to) params.append("area_to", args.area_to.toString());
  if (args.min_bedrooms) params.append("min_bedrooms", args.min_bedrooms.toString());
  if (args.construction_year_from) params.append("construction_year_from", args.construction_year_from.toString());
  if (args.construction_year_to) params.append("construction_year_to", args.construction_year_to.toString());
  if (args.ownership_type) params.append("ownership_type", args.ownership_type);
  if (args.is_new_property != null) params.append("is_new_property", args.is_new_property ? "1" : "0");
  if (args.lifecycle) {
    params.append("lifecycle", args.lifecycle);
  } else if (!args.include_sold) {
    params.append("lifecycle", "1");
  }

  if (args.facilities) {
    for (const facility of args.facilities) params.append("facilities", facility);
  }

  if (args.lat && args.lon) {
    params.append("lat", args.lat.toString());
    params.append("lon", args.lon.toString());
    params.append("radius", (args.radius || 3000).toString());
  }

  return `${HOMES_SEARCH_URL}?${params.toString()}`;
}

export function registerRealestateTools(server) {
  server.registerTool(
    "search_finn_realestate_locations",
    {
      description:
        "Search for location/area codes used by FINN.no Eiendom (real estate). Returns matching areas with location codes and listing counts. Use the location code in search_finn_realestate_homes. Optionally scope to a parent region (e.g. '0.22042' for Rogaland). You can also pass a free-text query directly to search_finn_realestate_homes via the query parameter.",
      inputSchema: {
        query: z.string().describe("Area name to search for (e.g. 'forus', 'grünerløkka', 'bergen')"),
        parent_location: z
          .string()
          .optional()
          .describe(
            "Optional parent region code to narrow the search (e.g. '0.20061' for Oslo, '0.22042' for Rogaland)",
          ),
      },
    },
    async (args) => {
      try {
        const params = new URLSearchParams();
        if (args.parent_location) params.append("location", args.parent_location);
        const url = `${HOMES_SEARCH_URL}?${params.toString()}`;
        const html = await fetchHtml(url);
        const locations = parseRealestateLocationFilters(html, args.query);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ search_url: url, query: args.query, locations }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error searching FINN real estate locations: ${error.message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "search_finn_realestate_homes",
    {
      description:
        "Search for homes/apartments for sale on FINN.no Eiendom (real estate). By default only returns listings that are currently for sale (sold listings are excluded). Supports filters for location, property type, price, size, bedrooms, facilities (e.g. parking), and sorting by price per square meter.\n\n" +
        "Common property_type codes: 3=Leilighet, 1=Enebolig, 2=Rekkehus, 4=Tomannsbolig, 5=Gårdsbruk/Småbruk, 6=Garasje/Parkering, 7=Tomt.\n\n" +
        "Common facilities codes: 23=Garasje/P-plass, 24=Fellesvaskeri, 28=Bredbånd, 16=Aircondition, 25=Alarm, 238=Lademulighet, 12=Moderne, 17=Strandlinje, 22=Turterreng, 209=Utsikt, 30=Vaktmester.\n\n" +
        "Example: cheapest apartment per m² in Forus with parking → query='forus' OR location='2.20012.20196.20718', property_type='3', facilities=['23'], sort='PRICE_SQM_ASC'.",
      inputSchema: {
        query: z.string().optional().describe("Free-text area search (e.g. 'forus', 'majorstuen')"),
        location: z
          .string()
          .optional()
          .describe(
            "Location code from search_finn_realestate_locations (e.g. '2.20012.20196.20718' for Forus/Godeset)",
          ),
        page: z.coerce.number().optional().describe("Page number"),
        sort: z
          .enum([
            "RELEVANCE",
            "PUBLISHED_DESC",
            "PRICE_ASC",
            "PRICE_DESC",
            "PRICE_SQM_ASC",
            "PRICE_SQM_DESC",
            "AREA_PROM_ASC",
            "AREA_PROM_DESC",
            "CONSTRUCTION_YEAR_ASC",
            "CONSTRUCTION_YEAR_DESC",
          ])
          .optional()
          .describe("Sort order. Use PRICE_SQM_ASC for cheapest per square meter."),
        property_type: z
          .string()
          .optional()
          .describe("Property type code. 3=Leilighet (apartment), 1=Enebolig, 2=Rekkehus"),
        price_from: z.coerce.number().optional().describe("Minimum price suggestion (NOK)"),
        price_to: z.coerce.number().optional().describe("Maximum price suggestion (NOK)"),
        price_total_from: z.coerce.number().optional().describe("Minimum total price including fees (NOK)"),
        price_total_to: z.coerce.number().optional().describe("Maximum total price including fees (NOK)"),
        rent_from: z.coerce.number().optional().describe("Minimum monthly shared costs / fellesutgifter (NOK)"),
        rent_to: z.coerce.number().optional().describe("Maximum monthly shared costs / fellesutgifter (NOK)"),
        area_from: z.coerce.number().optional().describe("Minimum size (m²)"),
        area_to: z.coerce.number().optional().describe("Maximum size (m²)"),
        min_bedrooms: z.coerce.number().optional().describe("Minimum number of bedrooms"),
        construction_year_from: z.coerce.number().optional().describe("Minimum construction year"),
        construction_year_to: z.coerce.number().optional().describe("Maximum construction year"),
        ownership_type: z
          .string()
          .optional()
          .describe("Ownership type code (e.g. 1=Selveier, 2=Andel, 3=Aksje, 4=Feste)"),
        facilities: z
          .array(z.string())
          .optional()
          .describe("Facility filter codes. 23=Garasje/P-plass (parking), 24=Fellesvaskeri, 28=Bredbånd"),
        is_new_property: z.boolean().optional().describe("If true, only new builds (nybygg)"),
        lifecycle: z
          .string()
          .optional()
          .describe("Sales status filter. Default '1' = Til salgs (for sale only). '2' = sold in last 3 days."),
        include_sold: z.boolean().optional().describe("If true, include sold listings in results. Default false."),
        lat: z.coerce.number().optional().describe("Latitude for map/radius search"),
        lon: z.coerce.number().optional().describe("Longitude for map/radius search"),
        radius: z.coerce.number().optional().describe("Search radius in meters (default 3000). Used with lat/lon."),
      },
    },
    async (args) => {
      try {
        const url = buildHomesSearchUrl(args);
        const html = await fetchHtml(url);
        const data = parseRealestateSearchResults(html, { includeSold: args.include_sold === true });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ search_url: url, ...data }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error searching FINN real estate: ${error.message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_finn_realestate_home",
    {
      description:
        "Get details of a home/apartment listing on FINN.no Eiendom by its FINN-kode. Returns price, address, size, bedrooms, description, and images. Returns an error if the listing is sold.",
      inputSchema: {
        finn_code: z.string().describe("The FINN-kode (numeric item ID) of the property"),
      },
    },
    async (args) => {
      try {
        const url = `https://www.finn.no/realestate/homes/ad.html?finnkode=${args.finn_code}`;
        const html = await fetchHtml(url);
        const details = parseRealestateDetail(html);

        if (details.status === "sold") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    finn_code: args.finn_code,
                    url,
                    status: "sold",
                    message: "This property has been sold and is no longer for sale.",
                    title: details.title,
                    address: details.address,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ finn_code: args.finn_code, url, ...details }, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error fetching FINN real estate listing: ${error.message}` }],
          isError: true,
        };
      }
    },
  );
}
