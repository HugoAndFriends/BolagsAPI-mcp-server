/**
 * Shared MCP server factory
 *
 * Creates a configured McpServer with all tools registered.
 * Used by both stdio and HTTP transports.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCompanyTools } from "./tools/company.js";
import { registerFinancialTools } from "./tools/financials.js";
import { registerComplianceTools } from "./tools/compliance.js";

export const SERVER_NAME = "bolagsapi";
export const SERVER_VERSION = "0.1.0";

/** Create a configured MCP server with all tools */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register all tools
  registerCompanyTools(server);
  registerFinancialTools(server);
  registerComplianceTools(server);

  return server;
}
