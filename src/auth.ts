/**
 * Authentication for MCP HTTP transport
 *
 * Implements API key verification compatible with OAuth 2.1 Bearer token format.
 * API keys are passed as Bearer tokens in the Authorization header.
 */
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";

// API key format: sk_live_xxx or sk_test_xxx
const API_KEY_REGEX = /^sk_(live|test)_[a-zA-Z0-9]{32,}$/;

/**
 * Validates that a string looks like a valid API key format
 */
function isValidApiKeyFormat(token: string): boolean {
  return API_KEY_REGEX.test(token);
}

/**
 * Verify an API key against the BolagsAPI backend
 */
async function verifyApiKeyWithBackend(apiKey: string): Promise<AuthInfo | null> {
  const apiUrl = process.env.BOLAGSAPI_URL ?? "https://api.bolagsapi.se/v1";

  try {
    // Call the API to validate the key (a simple endpoint that requires auth)
    const response = await fetch(`${apiUrl}/account/me`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      data?: { customer_id?: string; tier?: string };
    };

    return {
      token: apiKey,
      clientId: data.data?.customer_id ?? "unknown",
      scopes: [data.data?.tier ?? "free"],
    };
  } catch {
    return null;
  }
}

/**
 * Token verifier for Bearer auth middleware
 * Verifies API keys passed as Bearer tokens
 */
export class ApiKeyVerifier implements OAuthTokenVerifier {
  /** Verify an access token (API key) */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    // Check format first (fast fail)
    if (!isValidApiKeyFormat(token)) {
      throw new Error("Invalid API key format");
    }

    // Verify with backend
    const authInfo = await verifyApiKeyWithBackend(token);
    if (!authInfo) {
      throw new Error("Invalid or expired API key");
    }

    return authInfo;
  }
}

/** Singleton verifier instance */
export const apiKeyVerifier = new ApiKeyVerifier();
