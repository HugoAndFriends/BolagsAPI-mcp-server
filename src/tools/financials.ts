/**
 * Financial analysis MCP tools
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AnalyzeFinancialsInputSchema,
  AssessFinancialHealthInputSchema,
  GetReportsInputSchema,
} from "../schemas.js";
import {
  getFinancials,
  getAnalysis,
  getHealthScore,
  getFinancialHealth,
  getReports,
  ApiError,
  type FinancialsData,
  type AnalysisData,
  type HealthScore,
  type FinancialHealth,
  type ReportsList,
} from "../api-client.js";

/** Format number as currency */
function formatCurrency(value: number | null | undefined, currency = "SEK"): string {
  if (value === undefined || value === null) return "N/A";
  return value.toLocaleString("sv-SE") + " " + currency;
}

/** Format percentage */
function formatPercent(value: number | null | undefined): string {
  if (value === undefined || value === null) return "N/A";
  return value.toFixed(1) + "%";
}

/** Format a single fiscal year */
function formatYear(year: FinancialsData["years"][0], currency: string): string[] {
  const inc = year.income_statement;
  const bal = year.balance_sheet;
  const rat = year.ratios;
  const lines = [
    `## Fiscal Year ${year.fiscal_year_end}`,
    "",
    "### Income Statement",
    `- **Revenue:** ${formatCurrency(inc.revenue, currency)}`,
    `- **Operating Result:** ${formatCurrency(inc.operating_result, currency)}`,
    `- **Net Income:** ${formatCurrency(inc.net_income, currency)}`,
    "",
    "### Balance Sheet",
    `- **Total Assets:** ${formatCurrency(bal.total_assets, currency)}`,
    `- **Equity:** ${formatCurrency(bal.equity, currency)}`,
    `- **Cash:** ${formatCurrency(bal.cash_and_bank, currency)}`,
    "",
    "### Key Ratios",
    `- **Equity Ratio:** ${formatPercent(rat.equity_ratio)}`,
    `- **Profit Margin:** ${formatPercent(rat.profit_margin)}`,
    `- **Return on Equity:** ${formatPercent(rat.return_on_equity)}`,
  ];
  if (year.employees !== undefined && year.employees !== null) {
    lines.push(`- **Employees:** ${String(year.employees)}`);
  }
  lines.push("");
  return lines;
}

/** Format financial data for AI-friendly output */
function formatFinancialsResponse(data: FinancialsData, analysis?: AnalysisData): string {
  const lines: string[] = [`# Financial Data for ${data.orgnr}`, ""];
  for (const year of data.years) lines.push(...formatYear(year, data.currency));
  if (analysis) {
    lines.push(
      "## AI Analysis",
      `**Fiscal Year:** ${analysis.fiscal_year_end}`,
      `**Rating:** ${analysis.rating}`,
      `**Risk Score:** ${String(analysis.risk_score)}/100`,
      "",
      "### Summary",
      analysis.summary,
      "",
      "### Risk Factors",
    );
    for (const rf of analysis.risk_factors) {
      const severity = rf.severity.toUpperCase();
      lines.push(`- **[${severity}] ${rf.category}:** ${rf.description_en}`);
    }
  }
  return lines.join("\n");
}

/** Format health score factors */
function formatHealthFactors(factors: HealthScore["factors"]): string[] {
  const lines = ["### Score Factors"];
  lines.push(`- **Active:** ${factors.active ? "Yes" : "No"}`);
  lines.push(`- **F-skatt registered:** ${factors.f_skatt ? "Yes" : "No"}`);
  lines.push(`- **Company age:** ${factors.age_years.toFixed(1)} years`);
  lines.push(`- **Liquidation risk:** ${factors.liquidation_risk ? "Yes" : "No"}`);
  return lines;
}

/** Format industry benchmark */
function formatBenchmark(bm: HealthScore["industry_benchmark"]): string[] {
  if (!bm) return [];
  return [
    "", "### Industry Benchmark",
    `- **Industry:** ${bm.sni_description} (${bm.sni_code})`,
    `- **Industry average score:** ${String(bm.average_score)}`,
    `- **Percentile:** ${String(bm.percentile)}%`,
    `- **Sample size:** ${bm.sample_size.toLocaleString()} companies`,
  ];
}

/** Format financial flags */
function formatFinancialFlags(flags: FinancialHealth["financial_flags"]): string[] {
  const lines: string[] = ["### Financial Flags"];
  if (flags.public_defaults_count > 0) {
    lines.push(`- Public defaults: ${String(flags.public_defaults_count)} (${formatCurrency(flags.public_defaults_amount)})`);
  }
  if (flags.petitions_count > 0) {
    lines.push(`- Petitions: ${String(flags.petitions_count)} (${formatCurrency(flags.petitions_amount)})`);
  }
  if (flags.has_negative_equity) lines.push("- Has negative equity");
  if (flags.has_liquidation) lines.push("- Ongoing liquidation");
  if (flags.has_fi_warning) lines.push("- Finansinspektionen warning");
  if (flags.has_qualified_audit) lines.push("- Qualified audit opinion");
  const noFlags = flags.public_defaults_count === 0 && flags.petitions_count === 0 && !flags.has_negative_equity;
  if (noFlags && !flags.has_liquidation && !flags.has_fi_warning && !flags.has_qualified_audit) {
    lines.push("- No significant flags found");
  }
  return lines;
}

/** Format health + financial health for AI-friendly output */
function formatAssessmentResponse(hs: HealthScore, fh?: FinancialHealth): string {
  const lines = [
    `# Financial Assessment for ${hs.orgnr}`, "", "## Health Score",
    `**Overall Score:** ${String(hs.score)}/100`, "",
    ...formatHealthFactors(hs.factors),
    ...formatBenchmark(hs.industry_benchmark),
  ];
  if (fh) {
    lines.push("", "## Financial Health", `**Stability Grade:** ${fh.stability_grade}`);
    lines.push(`**Volatility Index:** ${String(fh.volatility_index)}/100`);
    lines.push("", "### Component Scores");
    lines.push(`- Finance Score: ${String(fh.finance_score)}`);
    lines.push(`- History Score: ${String(fh.history_score)}`);
    lines.push(`- Ability to Pay: ${String(fh.ability_to_pay_score)}`);
    lines.push(`- Ownership: ${String(fh.ownership_score)}`);
    lines.push("", ...formatFinancialFlags(fh.financial_flags));
  }
  return lines.join("\n");
}

/** Format reports list for AI-friendly output */
function formatReportsResponse(data: ReportsList): string {
  const lines = [
    `# Annual Reports for ${data.name}`,
    `**Org Nr:** ${data.orgnr}`,
    "",
    `Total reports: **${String(data.total)}**`,
    "",
  ];
  if (data.reports.length === 0) {
    lines.push("*No digital annual reports available.*");
    return lines.join("\n");
  }
  lines.push("| Year | Period End | Format | Audited | Status |");
  lines.push("|------|------------|--------|---------|--------|");
  for (const r of data.reports) {
    const audited = r.has_auditor ? "Yes" : "No";
    lines.push(`| ${String(r.year)} | ${r.period_end} | ${r.format} | ${audited} | ${r.status} |`);
  }
  if (data.pagination.has_more) {
    lines.push("", `*Showing ${String(data.pagination.returned)} of ${String(data.pagination.total)} reports*`);
  }
  return lines.join("\n");
}

/** Handle API errors */
function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) return `No financial data found. Company may not have filed digital reports.`;
    if (error.statusCode === 403) return `Access denied: ${error.message}`;
    return `API error: ${error.message}`;
  }
  return `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
}

/** Register financial tools with the MCP server */
export function registerFinancialTools(server: McpServer): void {
  server.registerTool("analyze_company_financials", {
    description: "Get detailed financial data from annual reports with optional AI analysis.",
    inputSchema: AnalyzeFinancialsInputSchema.shape,
  }, async (params) => {
    try {
      const financials = await getFinancials(params.orgnr);
      let analysis: AnalysisData | undefined;
      if (params.include_analysis) {
        try { analysis = await getAnalysis(params.orgnr, params.lang); } catch { /* may not be available */ }
      }
      return { content: [{ type: "text", text: formatFinancialsResponse(financials, analysis) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });

  server.registerTool("assess_financial_health", {
    description: "Get financial health assessment including health score, stability grade, and financial flags.",
    inputSchema: AssessFinancialHealthInputSchema.shape,
  }, async (params) => {
    try {
      const [hs, fh] = await Promise.all([getHealthScore(params.orgnr), getFinancialHealth(params.orgnr).catch(() => undefined)]);
      return { content: [{ type: "text", text: formatAssessmentResponse(hs, fh) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });

  server.registerTool("get_annual_reports", {
    description: "List available annual reports for a company.",
    inputSchema: GetReportsInputSchema.shape,
  }, async (params) => {
    try {
      const data = await getReports(params.orgnr);
      return { content: [{ type: "text", text: formatReportsResponse(data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }], isError: true };
    }
  });
}
