#!/usr/bin/env node
/**
 * BolagsAPI MCP Server (stdio transport)
 *
 * Exposes Swedish company data to AI agents via the Model Context Protocol.
 * This is the stdio transport for local usage (Claude Desktop, Cursor, etc.)
 *
 * For HTTP transport, use http-server.ts instead.
 *
 * Environment variables:
 * - BOLAGSAPI_URL: API base URL (default: https://api.bolagsapi.se/v1)
 * - BOLAGSAPI_KEY: API key for authentication (required)
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, SERVER_VERSION } from "./server.js";

/** Initialize and start the MCP server */
async function main(): Promise<void> {
  // Validate API key is set
  if (!process.env.BOLAGSAPI_KEY) {
    console.error(
      "Error: BOLAGSAPI_KEY environment variable is required.\n" +
        "Get your API key at https://bolagsapi.se/dashboard"
    );
    process.exit(1);
  }

  // Create server and connect stdio transport
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup (to stderr to avoid interfering with MCP protocol on stdout)
  console.error(`BolagsAPI MCP Server v${SERVER_VERSION} started (stdio)`);
}

// Run the server
main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
