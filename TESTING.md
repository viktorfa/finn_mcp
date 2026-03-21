# Testing the FINN.no MCP Server

This guide shows you how to test your MCP server locally before using it with Claude Desktop.

## Method 1: MCP Inspector (Recommended)

The MCP Inspector is the official web-based testing tool for MCP servers.

### Install the Inspector

```bash
# Install globally (only need to do this once)
npm install -g @modelcontextprotocol/inspector
```

### Run Your Server with Inspector

```bash
# From the project directory
npx @modelcontextprotocol/inspector node server.js
```

This will:
1. Start your MCP server
2. Open a web browser with the Inspector UI (usually at `http://localhost:5173`)
3. Automatically connect to your server

### Using the Inspector

The web interface provides:

- **Server Info**: Shows your server name, version, and capabilities
- **Tools Tab**: Lists all available tools (`search_finn`, `get_finn_item`)
- **Resources Tab**: Shows any resources (none for this server)
- **Test Tools**: Click on any tool to test it

### Testing Examples

1. **Test Search Tool**:
   - Click on `search_finn` in the tools list
   - Fill in parameters:
     ```json
     {
       "query": "skjorter",
       "sort": "PRICE_ASC"
     }
     ```
   - Click "Call Tool"
   - View the JSON response with search results

2. **Test Item Details**:
   - Click on `get_finn_item`
   - Fill in parameters:
     ```json
     {
       "finn_code": "423000046"
     }
     ```
   - Click "Call Tool"
   - View detailed item information

## Method 2: Manual Terminal Testing

If you prefer terminal testing:

### Start the Server

```bash
node server.js
```

### Send JSON Messages

In the same terminal, send these JSON messages:

1. **Initialize the connection**:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
```

2. **List available tools**:
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

3. **Test search**:
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_finn","arguments":{"query":"skjorter"}}}
```

4. **Test item details**:
```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_finn_item","arguments":{"finn_code":"423000046"}}}
```

## Method 3: Test Script

Create a `test.js` file:

```javascript
#!/usr/bin/env node
import { spawn } from 'child_process';

const server = spawn('node', ['server.js'], { stdio: 'pipe' });

function sendMessage(message) {
  server.stdin.write(JSON.stringify(message) + '\n');
}

// Initialize
sendMessage({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0" }
  }
});

// Test search after 1 second
setTimeout(() => {
  console.log('Testing search...');
  sendMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "search_finn",
      arguments: { query: "skjorter", sort: "PRICE_ASC" }
    }
  });
}, 1000);

// Test item details after 3 seconds
setTimeout(() => {
  console.log('Testing item details...');
  sendMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_finn_item",
      arguments: { finn_code: "423000046" }
    }
  });
}, 3000);

server.stdout.on('data', (data) => {
  const responses = data.toString().trim().split('\n');
  responses.forEach(response => {
    if (response) {
      console.log('Response:', JSON.parse(response));
    }
  });
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

// Clean up after 10 seconds
setTimeout(() => {
  server.kill();
  process.exit(0);
}, 10000);
```

Run with:
```bash
node test.js
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Kill existing processes with `pkill -f "node server.js"`
2. **Connection refused**: Make sure your server starts without errors
3. **No response**: Check that your server is listening on stdio correctly

### Debugging Tips

- Add `console.error()` statements to your server code (they show up in logs)
- Check the browser's developer console for Inspector errors
- Verify JSON syntax with a JSON validator
- Test individual selectors with simple curl commands first

## Development Workflow

Recommended workflow for development:

1. Make code changes to `server.js`
2. Test with MCP Inspector (`npx @modelcontextprotocol/inspector node server.js`)
3. Verify tools work correctly in the web UI
4. Once satisfied, restart Claude Desktop to test full integration
5. Repeat as needed

The Inspector is much faster than restarting Claude Desktop every time!