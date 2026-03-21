# Publishing Guide

## Prerequisites

1. **GitHub Account** - Create account if needed
2. **npm Account** - Create at npmjs.com if you want to publish to npm registry

## Steps to Publish

### 1. Update package.json

Replace placeholders in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR_USERNAME/finn_mcp.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/finn_mcp/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/finn_mcp#readme",
  "author": "Your Name <your.email@example.com>"
}
```

### 2. Create GitHub Repository

```bash
# Create new repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/finn_mcp.git
git branch -M main
git add .
git commit -m "Initial commit: FINN.no MCP server"
git push -u origin main
```

### 3. Test Locally First

Make sure it works:

```bash
# Test the server can start
node server.js

# Test with npx locally
npx .
```

### 4. Publish to npm (Optional)

```bash
# Login to npm
npm login

# Publish (make sure name is unique)
npm publish
```

If name is taken, change the name in package.json to something like:

- `@your-username/finn-mcp-server`
- `finn-mcp-server-by-yourname`

### 5. Create GitHub Release (Recommended)

1. Go to your GitHub repo
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0`
4. Title: `v1.0.0 - Initial Release`
5. Description: Brief overview of features

## Usage After Publishing

### If published to npm:

```bash
npx finn-mcp-server
```

### If only on GitHub:

```bash
npx github:viktorfa/finn_mcp
```

### Claude Desktop Config:

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

## Tips

- **Test thoroughly** before publishing
- **Use semantic versioning** (1.0.0, 1.0.1, etc.)
- **Write good commit messages**
- **Consider adding a LICENSE file** (MIT is already specified in package.json)
- **Update README** with real examples and screenshots if possible

## Updating Later

```bash
# Update version in package.json, then:
git add .
git commit -m "Version bump to 1.0.1"
git tag v1.0.1
git push origin main --tags

# If published to npm:
npm publish
```
