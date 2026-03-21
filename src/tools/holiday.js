import { z } from "zod";
import { fetchHtml, fetchJson } from "../fetch.js";
import { parseHolidayDetail } from "../holiday-parse.js";

export function registerHolidayTools(server) {
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
        const data = await fetchJson(url);
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
        const html = await fetchHtml(url);
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
}
