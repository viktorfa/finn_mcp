# FINN.no MCP Server

A Model Context Protocol (MCP) server for interacting with the Norwegian marketplace FINN.no.

## Features

- **Search products** with filters for price, condition, location, size, etc.
- **Get item details** including description, images, seller info

## Usage

### Claude Code

Add to `.mcp.json` in your project root (or `~/.claude/.mcp.json` for global access):

```json
{
  "mcpServers": {
    "finn-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["github:viktorfa/finn_mcp"]
    }
  }
}
```

**Alternative runners:**

```bash
# bunx
"command": "bunx", "args": ["github:viktorfa/finn_mcp"]

# pnpm dlx
"command": "pnpm", "args": ["dlx", "github:viktorfa/finn_mcp"]
```

### Claude Desktop

Add to your Claude Desktop config and restart Claude.

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

Config file locations:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

## Examples

- "Search for 'skjorter' on FINN.no"
- "Find items under 500 NOK on FINN.no"
- "Get details for FINN item 343932826"

## Development

```bash
git clone https://github.com/viktorfa/finn_mcp.git
cd finn_mcp
pnpm install
pnpm run dev
```

```bash
pnpm test         # run tests
pnpm run lint     # lint with biome
pnpm run format   # format with biome
```

## Disclaimer

Please respect FINN.no's terms of service. Avoid excessive requests and automated scraping that could impact their servers.

## License

MIT
