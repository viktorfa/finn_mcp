# FINN.no MCP Server

A Model Context Protocol (MCP) server for interacting with the Norwegian marketplace FINN.no.

## Usage

```json
{
  "mcpServers": {
    "finn-mcp": {
      "command": "npx",
      "args": ["github:viktorfa/finn_mcp"]
    }
  }
}
```

Add this to your Claude Desktop config and restart Claude.

Config file locations:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
- **Linux:** `~/.config/claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

## Examples

- "Search for 'skjorter' on FINN.no"
- "Find items under 500 NOK on FINN.no" 
- "Get details for FINN item 343932826"

## Features

- **Search products** with filters for price, condition, location, size, etc.
- **Get item details** including description, images, seller info

## Development

```bash
git clone https://github.com/viktorfa/finn_mcp.git
cd finn_mcp
npm install
npm run dev
```

## Disclaimer

Please respect FINN.no's terms of service. Avoid excessive requests and automated scraping that could impact their servers.

## License

MIT