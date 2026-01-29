/**
 * Company-related MCP tools
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  LookupCompanyInputSchema,
  SearchCompaniesInputSchema,
  GetTimelineInputSchema,
  GetSimilarInputSchema,
} from "../schemas.js";
import {
  getCompany,
  searchCompanies,
  getTimeline,
  getSimilarCompanies,
  ApiError,
  type CompanyData,
  type SearchResult,
  type TimelineData,
  type SimilarCompanies,
} from "../api-client.js";

/**
 * Format company basic info for markdown output
 */
function formatBasicInfo(data: CompanyData): string[] {
  const lines: string[] = [
    `# ${data.name}`,
    `**Organization Number:** ${data.orgnr_formatted}`,
    `**Form:** ${data.org_form.code} (${data.org_form.description})`,
    `**Status:** ${data.status}`,
    `**Registered:** ${data.registered_date}`,
  ];
  if (data.vat_number) {
    lines.push(`**VAT Number:** ${data.vat_number}`);
  }
  if (data.deregistered_date) {
    lines.push(`**Deregistered:** ${data.deregistered_date}`);
  }
  if (data.website) {
    lines.push(`**Website:** ${data.website}`);
  }
  return lines;
}

/**
 * Format company address and SNI codes
 */
function formatAddressAndSni(data: CompanyData): string[] {
  const lines: string[] = [];
  if (data.address) {
    const addr = data.address;
    const parts = [addr.street, addr.postal_code, addr.city, addr.country].filter(Boolean);
    if (parts.length > 0) lines.push(`**Address:** ${parts.join(", ")}`);
  }
  const sniCodes = data.business?.sni_codes;
  if (sniCodes && sniCodes.length > 0) {
    lines.push("", "## Industry Codes (SNI)");
    for (const sni of sniCodes) lines.push(`- ${sni.code}: ${sni.description}`);
  }
  if (data.business?.description) {
    lines.push("", "## Business Description");
    lines.push(data.business.description.replace(/\n/g, " ").substring(0, 500));
  }
  return lines;
}

/**
 * Format credit rating section
 */
function formatCreditSection(data: CompanyData): string[] {
  if (!data.credit_rating) return [];
  const cr = data.credit_rating;
  const lines = [
    "", "## Credit Rating",
    `**Rating:** ${cr.rating}`,
    `**Risk Score:** ${String(cr.risk_score)}/100`,
  ];
  if (cr.credit_limit != null) {
    lines.push(`**Credit Limit:** ${cr.credit_limit.toLocaleString()} SEK`);
  }
  if (cr.composite_score != null) {
    lines.push(`**Composite Score:** ${String(cr.composite_score)}/100`);
  }
  return lines;
}

/**
 * Format company data for AI-friendly output
 */
function formatCompanyResponse(data: CompanyData): string {
  const lines = [
    ...formatBasicInfo(data),
    ...formatAddressAndSni(data),
    ...formatCreditSection(data),
  ];
  if (data.financials) {
    lines.push("", "## Financial Data");
    lines.push("*See analyze_company_financials tool for detailed analysis*");
  }
  lines.push("", `*Source: ${data.meta.source}, Updated: ${data.meta.updated_at}*`);
  return lines.join("\n");
}

/**
 * Format search results for AI-friendly output
 */
function formatSearchResponse(data: SearchResult): string {
  const lines: string[] = [`Found **${String(data.total)}** companies matching "${data.query}":`, ""];
  for (const company of data.results) {
    const cityInfo = company.city ? ` (${company.city})` : "";
    const statusInfo = company.active ? "" : " [INACTIVE]";
    lines.push(`- **${company.name}** [${company.orgnr}] - ${company.org_form}${cityInfo}${statusInfo}`);
  }
  if (data.next_cursor) {
    lines.push("", `*More results available (showing ${String(data.results.length)} of ${String(data.total)})*`);
  }
  return lines.join("\n");
}

/**
 * Format timeline for AI-friendly output
 */
function formatTimelineResponse(data: TimelineData): string {
  const lines: string[] = [`# Timeline for ${data.orgnr}`, ""];
  for (const event of data.events) {
    lines.push(`- **${event.date}** [${event.type}]: ${event.description}`);
  }
  return lines.join("\n");
}

/**
 * Format similar companies for AI-friendly output
 */
function formatSimilarResponse(data: SimilarCompanies): string {
  const lines: string[] = [
    `# Similar Companies to ${data.orgnr}`, "",
    "| Company | Org Nr | SNI Match | City |",
    "|---------|--------|-----------|------|",
  ];
  for (const company of data.similar) {
    const sniMatch = company.sni_match?.join(", ") ?? "-";
    lines.push(`| ${company.name} | ${company.orgnr} | ${sniMatch} | ${company.city ?? "-"} |`);
  }
  return lines.join("\n");
}

/**
 * Handle API errors and return user-friendly message
 */
function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) return `Company not found. Verify the organization number is correct.`;
    if (error.statusCode === 403) return `Access denied: ${error.message}`;
    return `API error: ${error.message}`;
  }
  return `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
}

/** Register lookup and search tools */
function registerLookupTools(server: McpServer): void {
  server.registerTool("lookup_company", {
    description: "Get comprehensive information about a Swedish company by organization number.",
    inputSchema: LookupCompanyInputSchema.shape,
  }, async (params) => {
    try {
      const include: string[] = [];
      if (params.include_financials) include.push("financials");
      if (params.include_fi) include.push("fi");
      const data = await getCompany(params.orgnr, { include, lang: params.lang });
      return { content: [{ type: "text", text: formatCompanyResponse(data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });

  server.registerTool("search_companies", {
    description: "Search for Swedish companies by name with optional filters.",
    inputSchema: SearchCompaniesInputSchema.shape,
  }, async (params) => {
    try {
      const data = await searchCompanies({
        q: params.query, city: params.city, sni: params.sni,
        org_form: params.org_form, active_only: params.active_only, limit: params.limit,
      });
      return { content: [{ type: "text", text: formatSearchResponse(data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });
}

/** Register timeline and similar tools */
function registerRelatedTools(server: McpServer): void {
  server.registerTool("get_company_timeline", {
    description: "Get historical events for a Swedish company.",
    inputSchema: GetTimelineInputSchema.shape,
  }, async (params) => {
    try {
      const data = await getTimeline(params.orgnr, params.lang);
      return { content: [{ type: "text", text: formatTimelineResponse(data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });

  server.registerTool("get_similar_companies", {
    description: "Find companies similar by industry and location.",
    inputSchema: GetSimilarInputSchema.shape,
  }, async (params) => {
    try {
      const data = await getSimilarCompanies(params.orgnr, { limit: params.limit, same_city: params.same_city });
      return { content: [{ type: "text", text: formatSimilarResponse(data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });
}

/** Register all company-related tools with the MCP server */
export function registerCompanyTools(server: McpServer): void {
  registerLookupTools(server);
  registerRelatedTools(server);
}
