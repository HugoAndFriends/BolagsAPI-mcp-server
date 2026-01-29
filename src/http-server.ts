#!/usr/bin/env node
/**
 * BolagsAPI MCP HTTP Server
 *
 * Streamable HTTP transport for remote MCP access.
 * Supports Bearer token authentication using BolagsAPI keys.
 *
 * Environment variables:
 * - BOLAGSAPI_URL: API base URL (default: https://api.bolagsapi.se/v1)
 * - BOLAGSAPI_KEY: Default API key for unauthenticated requests (optional)
 * - PORT: HTTP port (default: 3001)
 * - HOST: Bind address (default: 127.0.0.1)
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { createServer, SERVER_VERSION } from "./server.js";
import { apiKeyVerifier } from "./auth.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "127.0.0.1";

// Allowed hosts for DNS rebinding protection
const LOCALHOST_HOSTS = ["127.0.0.1", "localhost", "::1", "[::1]"];
const isLocalhostBinding = LOCALHOST_HOSTS.includes(HOST);

/** DNS rebinding protection middleware */
function dnsRebindingProtection(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const host = req.headers.host?.split(":")[0];
  if (!host || !LOCALHOST_HOSTS.includes(host)) {
    res.status(403).json({ error: "forbidden", message: "Invalid host" });
    return;
  }
  next();
}

/** Create Express app with middleware */
function createApp(): express.Express {
  const app = express();

  // DNS rebinding protection for localhost bindings
  if (isLocalhostBinding) {
    app.use(dnsRebindingProtection);
  }

  // Parse JSON bodies
  app.use(express.json());

  // Rate limiting: 100 requests per minute per IP
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: "rate_limit", message: "Too many requests" },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Security headers
  app.use((_req, res, next) => {
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-Frame-Options", "DENY");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
  });

  return app;
}

/** Handle MCP requests */
async function handleMcpRequest(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const server = createServer();

  try {
    // Stateless transport - new instance per request
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}

/** Main entry point */
function main(): void {
  const app = createApp();

  // Bearer auth middleware - validates API keys
  const authMiddleware = requireBearerAuth({ verifier: apiKeyVerifier });

  // Health check endpoint (no auth)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: SERVER_VERSION });
  });

  // MCP endpoint with authentication
  app.post("/mcp", authMiddleware, (req, res) => {
    void handleMcpRequest(req, res);
  });

  // Method not allowed for GET/DELETE on /mcp
  app.get("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Use POST." },
      id: null,
    });
  });

  app.delete("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  });

  // Handle OPTIONS for CORS preflight
  app.options("/mcp", (_req, res) => {
    res.status(204).end();
  });

  // Start server
  app.listen(PORT, HOST, () => {
    console.error(`BolagsAPI MCP HTTP Server v${SERVER_VERSION}`);
    console.error(`Listening on http://${HOST}:${String(PORT)}/mcp`);
    console.error("Authentication: Bearer token (API key)");
  });
}

// Run
main();
