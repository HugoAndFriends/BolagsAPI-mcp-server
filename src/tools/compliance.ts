/**
 * Compliance and reference data MCP tools
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetComplianceInputSchema, GetIndustryStatsInputSchema } from "../schemas.js";
import {
  getCompanyScreening,
  getIndustryStats,
  ApiError,
  type CompanyScreening,
  type IndustryStats,
} from "../api-client.js";

/** Format a single board member screening */
function formatBoardMember(member: CompanyScreening["boardMemberScreenings"][0]): string {
  const risk = member.screening.riskLevel.toUpperCase();
  const flags: string[] = [];
  if (member.screening.hasSanctionsHits) flags.push("SANCTIONS");
  if (member.screening.hasPepHits) flags.push("PEP");
  const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
  return `- **${member.name}** (${member.position}): ${risk}${flagStr}`;
}

/** Format compliance/screening data for AI-friendly output */
function formatComplianceResponse(data: CompanyScreening): string {
  const lines = [
    `# Compliance Screening for ${data.companyName}`,
    `**Organization Number:** ${data.orgnr}`,
    `**Screened At:** ${data.screenedAt}`,
    "",
    "## Risk Assessment",
    `**Overall Risk Level:** ${data.overallRiskLevel.toUpperCase()}`,
    `**Sanctions Hits:** ${data.hasSanctionsHits ? "Yes" : "No"}`,
    `**PEP Hits:** ${data.hasPepHits ? "Yes" : "No"}`,
    `**Board Members Screened:** ${String(data.boardMemberScreenings.length)}`,
    "",
    "## Company Screening",
    `**Risk Level:** ${data.companyScreening.riskLevel}`,
  ];

  if (data.companyScreening.sanctionsHits.length > 0) {
    lines.push(`**Sanctions Hits:** ${String(data.companyScreening.sanctionsHits.length)}`);
  }
  if (data.companyScreening.pepHits.length > 0) {
    lines.push(`**PEP Hits:** ${String(data.companyScreening.pepHits.length)}`);
  }

  if (data.boardMemberScreenings.length > 0) {
    lines.push("", "## Board Member Screenings");
    lines.push(...data.boardMemberScreenings.map(formatBoardMember));
  }

  return lines.join("\n");
}

/** Format industry statistics for AI-friendly output */
function formatIndustryResponse(data: IndustryStats): string {
  const stats = data.statistics;
  const lines = [
    `# Industry Statistics: ${data.sni_code}`,
    `**Description:** ${data.description}`, "",
    "## Overview",
    `**Total Companies:** ${stats.total_companies}`,
    `**Active Companies:** ${stats.active_companies}`,
    `**Average Company Age:** ${stats.avg_age_years.toFixed(1)} years`,
    "",
    "## By Organization Form",
  ];

  for (const [form, count] of Object.entries(stats.by_org_form)) {
    lines.push(`- **${form}:** ${count}`);
  }

  lines.push("", "## Top Regions");
  const regions = Object.entries(stats.by_region).slice(0, 10);
  for (const [region, count] of regions) {
    lines.push(`- **${region}:** ${count} companies`);
  }

  return lines.join("\n");
}

/** Handle API errors */
function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) return `Data not found. Please verify the input is correct.`;
    if (error.statusCode === 403) return `Access denied: ${error.message}`;
    return `API error: ${error.message}`;
  }
  return `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
}

/** Register compliance tools with the MCP server */
export function registerComplianceTools(server: McpServer): void {
  server.registerTool("get_compliance_data", {
    description: "Screen a company against sanctions lists and PEP databases.",
    inputSchema: GetComplianceInputSchema.shape,
  }, async (params) => {
    try {
      const data = await getCompanyScreening(params.orgnr);
      return { content: [{ type: "text", text: formatComplianceResponse(data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });

  server.registerTool("get_industry_stats", {
    description: "Get industry statistics and benchmarks by SNI code.",
    inputSchema: GetIndustryStatsInputSchema.shape,
  }, async (params) => {
    try {
      const data = await getIndustryStats(params.sni_code, params.lang);
      return { content: [{ type: "text", text: formatIndustryResponse(data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });
}
