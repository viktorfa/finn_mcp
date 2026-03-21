#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerHolidayTools } from "./tools/holiday.js";
import { registerKlarnaTools } from "./tools/klarna.js";
import { registerMobilityTools } from "./tools/mobility.js";
import { registerTorgetTools } from "./tools/torget.js";

const server = new McpServer({
  name: "finn-mcp-server",
  version: "1.0.0",
});

registerTorgetTools(server);
registerMobilityTools(server);
registerHolidayTools(server);
registerKlarnaTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("FINN.no MCP server running on stdio");
