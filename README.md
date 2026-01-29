# @bolagsapi/mcp-server

Official MCP (Model Context Protocol) server for [BolagsAPI](https://bolagsapi.se) - Swedish company data for AI agents.

Enables Claude, ChatGPT, and other AI agents to access comprehensive Swedish company information including:
- Company lookup and search
- Financial analysis from annual reports
- Credit scoring and risk assessment
- Compliance screening (sanctions, PEP)
- Industry statistics and benchmarks

## Installation

```bash
npm install -g @bolagsapi/mcp-server
```

Or use npx:

```bash
npx @bolagsapi/mcp-server
```

## Requirements

- Node.js 18+
- BolagsAPI key (get one at [bolagsapi.se/dashboard](https://bolagsapi.se/dashboard))

## Quick Start

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "bolagsapi": {
      "command": "npx",
      "args": ["-y", "@bolagsapi/mcp-server"],
      "env": {
        "BOLAGSAPI_KEY": "sk_live_your_api_key_here"
      }
    }
  }
}
```

### Cursor IDE

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "bolagsapi": {
      "command": "npx",
      "args": ["-y", "@bolagsapi/mcp-server"],
      "env": {
        "BOLAGSAPI_KEY": "sk_live_your_api_key_here"
      }
    }
  }
}
```

### VS Code with Continue

Add to your Continue configuration:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "@bolagsapi/mcp-server"],
          "env": {
            "BOLAGSAPI_KEY": "sk_live_your_api_key_here"
          }
        }
      }
    ]
  }
}
```

## Available Tools

### Company Intelligence

| Tool | Description |
|------|-------------|
| `lookup_company` | Get comprehensive company info by organization number |
| `search_companies` | Search companies by name with filters |
| `get_company_timeline` | Historical events and milestones |
| `get_similar_companies` | Find peer companies by industry |

### Financial & Credit

| Tool | Description |
|------|-------------|
| `analyze_company_financials` | Financial data + AI analysis from annual reports |
| `assess_company_credit` | Credit score, health score, risk indicators |
| `get_annual_reports` | List available annual reports |

### Compliance & Reference

| Tool | Description |
|------|-------------|
| `get_compliance_data` | Sanctions and PEP screening |
| `get_industry_stats` | Industry benchmarks by SNI code |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOLAGSAPI_KEY` | Yes | - | Your BolagsAPI key |
| `BOLAGSAPI_URL` | No | `https://api.bolagsapi.se/v1` | API base URL |

## HTTP Transport (Remote)

For remote deployments, use the HTTP transport:

```bash
# Start HTTP server
npm run start:http

# Or with Docker
docker build -t bolagsapi-mcp .
docker run -p 3001:3001 -e BOLAGSAPI_KEY=sk_live_xxx bolagsapi-mcp
```

Environment variables for HTTP mode:
- `PORT`: HTTP port (default: 3001)
- `HOST`: Bind address (default: 127.0.0.1)

### HTTP Authentication

The HTTP transport requires Bearer token authentication:

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer sk_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Example Usage

Once configured, you can ask Claude:

> "Look up information about Spotify (org nr 556703-7485)"

> "Search for AI companies in Stockholm"

> "Analyze the financials for IKEA"

> "Check if company 5566778899 has any sanctions hits"

> "What's the credit rating for org 556677-8899?"

## Development

```bash
# Clone the repo
git clone https://github.com/HugoAndFriends/BolagsAPI-mcp-server.git
cd BolagsAPI-mcp-server

# Install dependencies
pnpm install

# Run in development mode
BOLAGSAPI_KEY=sk_live_xxx pnpm dev

# Build
pnpm build
```

## Security

- API keys are validated against the BolagsAPI backend
- Rate limiting: 100 requests/minute per IP (HTTP mode)
- DNS rebinding protection for localhost bindings
- CORS enabled for browser clients

## Support

- Documentation: [bolagsapi.se/docs](https://bolagsapi.se/docs)
- Issues: [github.com/HugoAndFriends/BolagsAPI-mcp-server/issues](https://github.com/HugoAndFriends/BolagsAPI-mcp-server/issues)
- Email: dev@bolagsapi.se

## License

MIT
