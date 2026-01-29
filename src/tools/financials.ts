/**
 * Financial analysis MCP tools
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AnalyzeFinancialsInputSchema,
  AssessCreditInputSchema,
  GetReportsInputSchema,
} from "../schemas.js";
import {
  getFinancials,
  getAnalysis,
  getHealthScore,
  getReports,
  getCompany,
  ApiError,
  type FinancialsData,
  type AnalysisData,
  type HealthScore,
  type CreditRating,
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

/** Format credit rating risk indicators */
function formatRiskIndicators(ri: CreditRating["risk_indicators"]): string[] {
  const lines: string[] = ["### Risk Indicators"];
  if (ri.payment_remarks_count > 0) {
    lines.push(`- Payment remarks: ${String(ri.payment_remarks_count)} (${formatCurrency(ri.payment_remarks_amount)})`);
  }
  if (ri.petitions_count > 0) {
    lines.push(`- Petitions: ${String(ri.petitions_count)} (${formatCurrency(ri.petitions_amount)})`);
  }
  if (ri.has_negative_equity) lines.push("- Has negative equity");
  if (ri.has_liquidation) lines.push("- Ongoing liquidation");
  if (ri.has_fi_warning) lines.push("- Finansinspektionen warning");
  if (ri.has_qualified_audit) lines.push("- Qualified audit opinion");
  const noRisk = ri.payment_remarks_count === 0 && ri.petitions_count === 0 && !ri.has_negative_equity;
  if (noRisk && !ri.has_liquidation && !ri.has_fi_warning && !ri.has_qualified_audit) {
    lines.push("- No significant risk indicators found");
  }
  return lines;
}

/** Format health/credit score for AI-friendly output */
function formatCreditResponse(hs: HealthScore, cr?: CreditRating): string {
  const lines = [
    `# Credit Assessment for ${hs.orgnr}`, "", "## Health Score",
    `**Overall Score:** ${String(hs.score)}/100`, "",
    ...formatHealthFactors(hs.factors),
    ...formatBenchmark(hs.industry_benchmark),
  ];
  if (cr) {
    lines.push("", "## Credit Rating", `**Rating:** ${cr.rating}`);
    lines.push(`**Risk Score:** ${String(cr.risk_score)}/100`);
    if (cr.credit_limit != null) {
      lines.push(`**Recommended Credit Limit:** ${cr.credit_limit.toLocaleString()} SEK`);
    }
    lines.push("", "### Component Scores");
    lines.push(`- Finance Score: ${String(cr.finance_score)}`);
    lines.push(`- History Score: ${String(cr.history_score)}`);
    lines.push(`- Ability to Pay: ${String(cr.ability_to_pay_score)}`);
    lines.push(`- Ownership: ${String(cr.ownership_score)}`);
    lines.push("", ...formatRiskIndicators(cr.risk_indicators));
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

  server.registerTool("assess_company_credit", {
    description: "Get credit assessment including health score and risk indicators.",
    inputSchema: AssessCreditInputSchema.shape,
  }, async (params) => {
    try {
      const [hs, company] = await Promise.all([getHealthScore(params.orgnr), getCompany(params.orgnr)]);
      return { content: [{ type: "text", text: formatCreditResponse(hs, company.credit_rating) }] };
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
