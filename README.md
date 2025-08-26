# FINN.no MCP Server

A Model Context Protocol (MCP) server for interacting with the Norwegian marketplace FINN.no.

## Features

- **Search products** - Search FINN.no with filters for query, page, sort order, clothing size, and price range
- **Get item details** - Retrieve detailed information about specific products using their FINN-kode

## Quick Start with npx

You can run this server directly without installation:

```bash
npx finn-mcp-server
```

Or use it in Claude Desktop config:

```json
{
  "mcpServers": {
    "finn-mcp": {
      "command": "npx",
      "args": ["finn-mcp-server"]
    }
  }
}
```

## Local Development

Clone and install dependencies:

```bash
git clone https://github.com/viktorfa/finn_mcp.git
cd finn_mcp
npm install
```

## Local Testing with Claude Desktop

### 1. Configure Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "finn-mcp": {
      "command": "node",
      "args": ["./server.js"]
    }
  }
}
```

### 2. Restart Claude Desktop

Completely quit and restart Claude Desktop. You should see an MCP indicator in the bottom-right corner.

### 3. Test the Tools

Try these example prompts in Claude Desktop:

- "Search for 'skjorter' on FINN.no"
- "Find items under 500 NOK on FINN.no" 
- "Get details for FINN item 343932826"

## Available Tools

### `search_finn`
Search for products on FINN.no marketplace.

**Parameters:**
- `query` (string) - Search term
- `page` (number) - Page number (default: 1)
- `sort` (string) - Sort order: PUBLISHED_DESC, PUBLISHED_ASC, PRICE_ASC, PRICE_DESC
- `clothing_size` (string) - Size filter: XS, S, M, L, XL, XXL
- `price_from` (number) - Minimum price
- `price_to` (number) - Maximum price

### `get_finn_item`
Get details of a specific item by its FINN-kode.

**Parameters:**
- `finn_code` (string, required) - The numeric item ID

## Development

Run in development mode with auto-restart:
```bash
npm run dev
```

## Publishing

This server can be published to npm or used directly from GitHub for sharing with others.

## License

MIT