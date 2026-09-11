import { registerHolidayTools } from "./holiday.js";
import { registerKlarnaTools } from "./klarna.js";
import { registerMobilityTools } from "./mobility.js";
import { registerTorgetTools } from "./torget.js";

export function registerTools(target) {
  registerTorgetTools(target);
  registerMobilityTools(target);
  registerHolidayTools(target);
  registerKlarnaTools(target);
}
